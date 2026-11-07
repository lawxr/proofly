// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ProoflyKYCRegistry} from "../src/ProoflyKYCRegistry.sol";
import {ProoflyOperations} from "../src/ProoflyOperations.sol";

contract DeployProofly is Script {
    function run() external returns (address kycAddress, address operationsAddress) {
        uint256 deployerPrivateKey = vm.envOr(
            "OPERATOR_PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80) // Anvil default key
        );

        address deployer = vm.addr(deployerPrivateKey);
        console.log("Desplegando contratos Proofly con cuenta:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Desplegar Registro KYC
        ProoflyKYCRegistry kyc = new ProoflyKYCRegistry(deployer);
        kycAddress = address(kyc);
        console.log("ProoflyKYCRegistry desplegado en:", kycAddress);

        // 2. Desplegar Motor de Operaciones ERC-1155
        ProoflyOperations operations = new ProoflyOperations(deployer, kycAddress);
        operationsAddress = address(operations);
        console.log("ProoflyOperations desplegado en:", operationsAddress);

        // 3. Configurar Operador y Reconciliador
        operations.setOperator(deployer, true);
        operations.setReconciler(deployer, true);
        console.log("Cuenta deployer configurada como Operador y Reconciliador oficial");

        vm.stopBroadcast();
    }
}
