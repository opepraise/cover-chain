import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const CUSD_MAINNET = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
const CUSD_ALFAJORES = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Deploying with:", deployer.address);

  const cUSD = network.name === "celo" ? CUSD_MAINNET : CUSD_ALFAJORES;
  const CoverChain = await ethers.getContractFactory("CoverChain");
  const contract = await CoverChain.deploy(cUSD);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("CoverChain deployed to:", address);
  console.log("3 default plans created: Device, Medical, Weather");

  const deployment = {
    network: network.name,
    address,
    cUSD,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, `../deployments/${network.name}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log("Deployment saved to:", outPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
