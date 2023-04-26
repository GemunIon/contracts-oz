import { expect } from "chai";
import { ethers } from "hardhat";
import { constants, Contract } from "ethers";

import { amount } from "@gemunion/contracts-constants";

import { deployErc20Borrower } from "./fixtures";
import { TMintAmountERC20Fn } from "../shared/interfaces/IERC20MintFn";

export function shouldFlashLoan(factory: () => Promise<Contract>, mint: TMintAmountERC20Fn) {
  describe("flashLoan", function () {
    it("success", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address, amount);

      const erc20FlashBorrowerInstance = await deployErc20Borrower();

      const tx = contractInstance.flashLoan(erc20FlashBorrowerInstance.address, contractInstance.address, amount, "0x");

      await expect(tx)
        .to.emit(contractInstance, "Transfer")
        .withArgs(constants.AddressZero, erc20FlashBorrowerInstance.address, amount);
      await expect(tx)
        .to.emit(contractInstance, "Transfer")
        .withArgs(erc20FlashBorrowerInstance.address, constants.AddressZero, amount);
      await expect(tx)
        .to.emit(erc20FlashBorrowerInstance, "BalanceOf")
        .withArgs(contractInstance.address, erc20FlashBorrowerInstance.address, amount);
      await expect(tx)
        .to.emit(erc20FlashBorrowerInstance, "TotalSupply")
        .withArgs(contractInstance.address, amount * 2);

      const totalSupply = await contractInstance.totalSupply();
      expect(totalSupply).to.equal(amount);

      const balanceOf = await contractInstance.balanceOf(erc20FlashBorrowerInstance.address);
      expect(balanceOf).to.equal(0);

      const allowance = await contractInstance.allowance(erc20FlashBorrowerInstance.address, contractInstance.address);
      expect(allowance).to.equal(0);
    });

    it("missing return value", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address, amount);

      const erc20FlashBorrower = await ethers.getContractFactory("ERC3156FlashBorrowerMock");
      const erc20FlashBorrowerInstance = await erc20FlashBorrower.deploy(false, true);

      const tx = contractInstance.flashLoan(erc20FlashBorrowerInstance.address, contractInstance.address, amount, "0x");
      await expect(tx).to.be.revertedWith("ERC20FlashMint: invalid return value");
    });

    it("missing approval", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address, amount);

      const erc20FlashBorrower = await ethers.getContractFactory("ERC3156FlashBorrowerMock");
      const erc20FlashBorrowerInstance = await erc20FlashBorrower.deploy(true, false);

      const tx = contractInstance.flashLoan(erc20FlashBorrowerInstance.address, contractInstance.address, amount, "0x");
      await expect(tx).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("unavailable funds", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address, amount);

      const erc20FlashBorrower = await ethers.getContractFactory("ERC3156FlashBorrowerMock");
      const erc20FlashBorrowerInstance = await erc20FlashBorrower.deploy(true, true);

      const data = contractInstance.interface.encodeFunctionData("transfer", [receiver.address, 10]);

      const tx = contractInstance.flashLoan(erc20FlashBorrowerInstance.address, contractInstance.address, amount, data);
      await expect(tx).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });

    it("more than maxFlashLoan", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address, amount);

      const erc20FlashBorrower = await ethers.getContractFactory("ERC3156FlashBorrowerMock");
      const erc20FlashBorrowerInstance = await erc20FlashBorrower.deploy(true, true);

      const data = contractInstance.interface.encodeFunctionData("transfer", [receiver.address, 10]);

      // _mint overflow reverts using a panic code. No reason string.
      const tx = contractInstance.flashLoan(
        erc20FlashBorrowerInstance.address,
        contractInstance.address,
        constants.MaxUint256,
        data,
      );
      await expect(tx).to.be.revertedWith("ERC20FlashMint: amount exceeds maxFlashLoan");
    });
  });
}
