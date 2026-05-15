// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CoverChain
/// @notice Parametric micro-insurance for MiniPay users on Celo.
///         Covers device, medical, and farm weather risks with cUSD payouts.

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CoverChain is Ownable, ReentrancyGuard {
    IERC20 public immutable cUSD;

    enum CoverType { DEVICE, MEDICAL, WEATHER }
    enum ClaimStatus { PENDING, APPROVED, REJECTED, PAID }

    struct Plan {
        CoverType coverType;
        string name;
        uint256 monthlyPremium;   // in cUSD (18 decimals)
        uint256 maxPayout;
        bool active;
    }

    struct Policy {
        address holder;
        uint256 planId;
        uint256 startDate;
        uint256 endDate;
        uint256 premiumPaid;
        bool active;
    }

    struct Claim {
        uint256 policyId;
        address claimant;
        string evidence;          // IPFS hash or description
        uint256 requestedAmount;
        ClaimStatus status;
        uint256 submittedAt;
        uint256 approvalVotes;
        uint256 rejectionVotes;
        bool paid;
    }

    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant VALIDATOR_STAKE = 1e14;  // 0.0001 cUSD to become validator
    uint256 public constant VALIDATOR_REWARD_BPS = 100; // 1% of claim payout
    uint256 public constant MIN_CLAIM_AMOUNT = 1e12; // 0.000001 cUSD minimum claim

    uint256 private _planCounter;
    uint256 private _policyCounter;
    uint256 private _claimCounter;

    mapping(uint256 => Plan) public plans;
    mapping(uint256 => Policy) public policies;
    mapping(uint256 => Claim) public claims;

    mapping(address => uint256[]) public userPolicies;
    mapping(address => uint256[]) public userClaims;

    // Validators: staked cUSD to participate in claim voting
    mapping(address => uint256) public validatorStake;
    mapping(address => bool) public isValidator;
    address[] public validators;

    // claim => validator => voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    uint256 public riskPool;

    // Parametric oracle — owner acts as trusted oracle for weather triggers
    // In production: replace with Chainlink oracle integration
    mapping(uint256 => bool) public parametricTriggered; // policyId => triggered

    event PlanCreated(uint256 indexed planId, string name, uint256 premium, uint256 maxPayout);
    event PolicyPurchased(uint256 indexed policyId, address indexed holder, uint256 planId, uint256 endDate);
    event PremiumPaid(uint256 indexed policyId, uint256 amount);
    event ClaimSubmitted(uint256 indexed claimId, uint256 indexed policyId, address claimant);
    event ClaimVoted(uint256 indexed claimId, address indexed validator, bool approved);
    event ClaimPaid(uint256 indexed claimId, uint256 amount);
    event ClaimRejected(uint256 indexed claimId);
    event ParametricPayout(uint256 indexed policyId, uint256 amount);
    event ValidatorJoined(address indexed validator);
    event ValidatorLeft(address indexed validator);

    /// @param _cUSD Address of the cUSD ERC-20 token on the target network
    constructor(address _cUSD) Ownable(msg.sender) {
        cUSD = IERC20(_cUSD);
        _createDefaultPlans();
    }

    function _createDefaultPlans() internal {
        // Device insurance: 0.00001 cUSD/month, max 0.0001 cUSD payout
        plans[_planCounter++] = Plan(CoverType.DEVICE, "Device Cover", 1e13, 1e14, true);
        // Medical micro-insurance: 0.00002 cUSD/month, max 0.0002 cUSD payout
        plans[_planCounter++] = Plan(CoverType.MEDICAL, "Medical Cover", 2e13, 2e14, true);
        // Weather parametric: 0.00003 cUSD/month, max 0.0005 cUSD payout (auto-triggered)
        plans[_planCounter++] = Plan(CoverType.WEATHER, "Farm Weather Cover", 3e13, 5e14, true);
    }

    /// @notice Purchase a new insurance policy for 1–12 months
    /// @param planId ID of the plan to purchase
    /// @param durationMonths Number of months (1–12) to cover
    /// @return policyId The ID of the newly created policy
    function purchasePolicy(uint256 planId, uint256 durationMonths) external nonReentrant returns (uint256 policyId) {
        require(plans[planId].active, "Plan inactive");
        require(durationMonths >= 1 && durationMonths <= 12, "Invalid duration");

        uint256 totalPremium = plans[planId].monthlyPremium * durationMonths;
        require(cUSD.transferFrom(msg.sender, address(this), totalPremium), "Payment failed");

        riskPool += totalPremium;

        policyId = _policyCounter++;
        uint256 endDate = block.timestamp + (durationMonths * 30 days);

        policies[policyId] = Policy({
            holder: msg.sender,
            planId: planId,
            startDate: block.timestamp,
            endDate: endDate,
            premiumPaid: totalPremium,
            active: true
        });

        userPolicies[msg.sender].push(policyId);
        emit PolicyPurchased(policyId, msg.sender, planId, endDate);
    }

    function payPremium(uint256 policyId) external nonReentrant {
        Policy storage policy = policies[policyId];
        require(policy.holder == msg.sender, "Not holder");
        require(!policy.active || policy.endDate < block.timestamp + 30 days, "Not due");

        Plan storage plan = plans[policy.planId];
        uint256 amount = plan.monthlyPremium;

        require(cUSD.transferFrom(msg.sender, address(this), amount), "Payment failed");
        riskPool += amount;
        policy.premiumPaid += amount;
        policy.endDate += 30 days;
        policy.active = true;

        emit PremiumPaid(policyId, amount);
    }

    /// @notice Submit a claim against an active non-weather policy
    /// @param policyId ID of the policy to claim against
    /// @param evidence IPFS hash or plain-text description of the incident
    /// @param requestedAmount Amount of cUSD requested (must be ≤ plan maxPayout)
    /// @return claimId The ID of the newly created claim
    function submitClaim(
        uint256 policyId,
        string calldata evidence,
        uint256 requestedAmount
    ) external returns (uint256 claimId) {
        Policy storage policy = policies[policyId];
        require(policy.holder == msg.sender, "Not holder");
        require(policy.active && block.timestamp <= policy.endDate, "Policy expired");

        Plan storage plan = plans[policy.planId];
        require(plan.coverType != CoverType.WEATHER, "Use parametric trigger");
        require(requestedAmount >= MIN_CLAIM_AMOUNT, "Below minimum claim");
        require(requestedAmount <= plan.maxPayout, "Exceeds max payout");
        require(requestedAmount <= riskPool, "Pool insufficient");

        claimId = _claimCounter++;
        claims[claimId] = Claim({
            policyId: policyId,
            claimant: msg.sender,
            evidence: evidence,
            requestedAmount: requestedAmount,
            status: ClaimStatus.PENDING,
            submittedAt: block.timestamp,
            approvalVotes: 0,
            rejectionVotes: 0,
            paid: false
        });

        userClaims[msg.sender].push(claimId);
        emit ClaimSubmitted(claimId, policyId, msg.sender);
    }

    /// @notice Cast a vote on a pending claim (validators only)
    /// @param claimId ID of the claim to vote on
    /// @param approve True to approve the claim, false to reject
    function voteOnClaim(uint256 claimId, bool approve) external {
        require(isValidator[msg.sender], "Not a validator");
        require(!hasVoted[claimId][msg.sender], "Already voted");
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.PENDING, "Claim not pending");
        require(block.timestamp <= claim.submittedAt + VOTING_PERIOD, "Voting closed");

        hasVoted[claimId][msg.sender] = true;

        if (approve) {
            claim.approvalVotes += 1;
        } else {
            claim.rejectionVotes += 1;
        }

        emit ClaimVoted(claimId, msg.sender, approve);

        _tryFinalizeVote(claimId);
    }

    function _tryFinalizeVote(uint256 claimId) internal {
        Claim storage claim = claims[claimId];
        uint256 total = validators.length;
        if (total == 0) return;

        uint256 majority = total / 2 + 1;

        if (claim.approvalVotes >= majority) {
            claim.status = ClaimStatus.APPROVED;
            _payClaim(claimId);
        } else if (claim.rejectionVotes >= majority) {
            claim.status = ClaimStatus.REJECTED;
            emit ClaimRejected(claimId);
        }
    }

    function _payClaim(uint256 claimId) internal {
        Claim storage claim = claims[claimId];
        require(!claim.paid, "Already paid");
        require(riskPool >= claim.requestedAmount, "Pool insufficient");

        claim.paid = true;
        riskPool -= claim.requestedAmount;

        require(cUSD.transfer(claim.claimant, claim.requestedAmount), "Payout failed");
        emit ClaimPaid(claimId, claim.requestedAmount);
    }

    function finalizeExpiredClaim(uint256 claimId) external {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.PENDING, "Not pending");
        require(block.timestamp > claim.submittedAt + VOTING_PERIOD, "Voting ongoing");

        if (claim.approvalVotes > claim.rejectionVotes) {
            claim.status = ClaimStatus.APPROVED;
            _payClaim(claimId);
        } else {
            claim.status = ClaimStatus.REJECTED;
            emit ClaimRejected(claimId);
        }
    }

    /// @notice Create a new insurance plan (owner only)
    function addPlan(
        CoverType coverType,
        string calldata name,
        uint256 monthlyPremium,
        uint256 maxPayout
    ) external onlyOwner returns (uint256 planId) {
        planId = _planCounter++;
        plans[planId] = Plan(coverType, name, monthlyPremium, maxPayout, true);
        emit PlanCreated(planId, name, monthlyPremium, maxPayout);
    }

    /// @notice Deactivate a plan so no new policies can be purchased against it
    function deactivatePlan(uint256 planId) external onlyOwner {
        require(plans[planId].active, "Already inactive");
        plans[planId].active = false;
    }

    // Owner/oracle triggers automatic payout for weather policies
    function triggerParametricPayout(uint256 policyId) external onlyOwner nonReentrant {
        Policy storage policy = policies[policyId];
        require(policy.active && block.timestamp <= policy.endDate, "Policy expired");

        Plan storage plan = plans[policy.planId];
        require(plan.coverType == CoverType.WEATHER, "Not weather policy");
        require(!parametricTriggered[policyId], "Already triggered");
        require(riskPool >= plan.maxPayout, "Pool insufficient");

        parametricTriggered[policyId] = true;
        riskPool -= plan.maxPayout;
        policy.active = false;

        require(cUSD.transfer(policy.holder, plan.maxPayout), "Payout failed");
        emit ParametricPayout(policyId, plan.maxPayout);
    }

    /// @notice Stake 10 cUSD to become a validator and vote on claims
    function stakeAsValidator() external nonReentrant {
        require(!isValidator[msg.sender], "Already validator");
        require(cUSD.transferFrom(msg.sender, address(this), VALIDATOR_STAKE), "Stake failed");
        isValidator[msg.sender] = true;
        validatorStake[msg.sender] = VALIDATOR_STAKE;
        validators.push(msg.sender);
        emit ValidatorJoined(msg.sender);
    }

    /// @notice Withdraw validator stake and exit the validator set
    function unstakeValidator() external nonReentrant {
        require(isValidator[msg.sender], "Not a validator");
        uint256 stake = validatorStake[msg.sender];
        isValidator[msg.sender] = false;
        validatorStake[msg.sender] = 0;

        for (uint256 i = 0; i < validators.length; i++) {
            if (validators[i] == msg.sender) {
                validators[i] = validators[validators.length - 1];
                validators.pop();
                break;
            }
        }

        require(cUSD.transfer(msg.sender, stake), "Unstake failed");
        emit ValidatorLeft(msg.sender);
    }

    function getUserPolicies(address user) external view returns (uint256[] memory) {
        return userPolicies[user];
    }

    function getUserClaims(address user) external view returns (uint256[] memory) {
        return userClaims[user];
    }

    function getPlanCount() external view returns (uint256) {
        return _planCounter;
    }

    function getPolicyCount() external view returns (uint256) {
        return _policyCounter;
    }

    function getClaimCount() external view returns (uint256) {
        return _claimCounter;
    }

    function getValidators() external view returns (address[] memory) {
        return validators;
    }
}
