import { expect } from "chai";
import { ethers } from "hardhat";
import { constants, Contract } from "ethers";

import { amount } from "@gemunion/contracts-constants";

import type { IERC20Options } from "../shared/defaultMint";
import { defaultMintERC20 } from "../shared/defaultMint";
import { deployErc20Borrower } from "./fixtures";

export function shouldFlashCustom(factory: () => Promise<Contract>, options: IERC20Options = {}) {
  const { mint = defaultMintERC20 } = options;

  describe("custom flash fee & custom fee receiver", function () {
    const borrowerInitialBalance = amount * 2;
    const customFlashFee = amount / 2;

    it("default flash fee receiver", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address, amount);

      const erc20FlashBorrowerInstance = await deployErc20Borrower();

      const tx1 = mint(contractInstance, owner, erc20FlashBorrowerInstance.address, borrowerInitialBalance);
      await expect(tx1)
        .to.emit(contractInstance, "Transfer")
        .withArgs(constants.AddressZero, erc20FlashBorrowerInstance.address, borrowerInitialBalance);

      const balanceOf = await contractInstance.balanceOf(erc20FlashBorrowerInstance.address);
      expect(balanceOf).to.equal(borrowerInitialBalance);

      await contractInstance.setFlashFee(customFlashFee);
      const flashFee = await contractInstance.flashFee(contractInstance.address, amount);
      expect(flashFee).to.equal(customFlashFee);

      const feeReceiver = await contractInstance.flashFeeReceiver();
      expect(feeReceiver).to.equal(constants.AddressZero);

      const tx2 = await contractInstance.flashLoan(
        erc20FlashBorrowerInstance.address,
        contractInstance.address,
        amount,
        "0x",
      );
      await expect(tx2)
        .to.emit(contractInstance, "Transfer")
        .withArgs(constants.AddressZero, erc20FlashBorrowerInstance.address, amount);
      await expect(tx2)
        .to.emit(contractInstance, "Transfer")
        .withArgs(erc20FlashBorrowerInstance.address, constants.AddressZero, amount + customFlashFee);
      await expect(tx2)
        .to.emit(erc20FlashBorrowerInstance, "BalanceOf")
        .withArgs(contractInstance.address, erc20FlashBorrowerInstance.address, borrowerInitialBalance + amount);
      await expect(tx2)
        .to.emit(erc20FlashBorrowerInstance, "TotalSupply")
        .withArgs(contractInstance.address, borrowerInitialBalance + amount + amount);

      const totalSupply = await contractInstance.totalSupply();
      expect(totalSupply).to.equal(amount + borrowerInitialBalance - customFlashFee);

      const balanceOf1 = await contractInstance.balanceOf(erc20FlashBorrowerInstance.address);
      expect(balanceOf1).to.equal(borrowerInitialBalance - customFlashFee);

      const balanceOf2 = await contractInstance.balanceOf(feeReceiver);
      expect(balanceOf2).to.equal(0);

      const allowance = await contractInstance.allowance(erc20FlashBorrowerInstance.address, contractInstance.address);
      expect(allowance).to.equal(0);
    });

    it("custom flash fee receiver", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address, amount);

      const erc20FlashBorrowerInstance = await deployErc20Borrower();

      const tx1 = mint(contractInstance, owner, erc20FlashBorrowerInstance.address, borrowerInitialBalance);
      await expect(tx1)
        .to.emit(contractInstance, "Transfer")
        .withArgs(constants.AddressZero, erc20FlashBorrowerInstance.address, borrowerInitialBalance);

      const balanceOf1 = await contractInstance.balanceOf(erc20FlashBorrowerInstance.address);
      expect(balanceOf1).to.equal(borrowerInitialBalance);

      await contractInstance.setFlashFee(customFlashFee);
      const flashFee = await contractInstance.flashFee(contractInstance.address, amount);
      expect(flashFee).to.equal(customFlashFee);

      await contractInstance.setFlashFeeReceiver(receiver.address);
      const feeReceiver = await contractInstance.flashFeeReceiver();
      expect(feeReceiver).to.equal(receiver.address);

      const balanceOf2 = await contractInstance.balanceOf(receiver.address);
      expect(balanceOf2).to.equal(0);

      const tx2 = await contractInstance.flashLoan(
        erc20FlashBorrowerInstance.address,
        contractInstance.address,
        amount,
        "0x",
      );

      await expect(tx2)
        .to.emit(contractInstance, "Transfer")
        .withArgs(constants.AddressZero, erc20FlashBorrowerInstance.address, amount);
      await expect(tx2)
        .to.emit(contractInstance, "Transfer")
        .withArgs(erc20FlashBorrowerInstance.address, constants.AddressZero, amount);
      await expect(tx2)
        .to.emit(contractInstance, "Transfer")
        .withArgs(erc20FlashBorrowerInstance.address, receiver.address, customFlashFee);
      await expect(tx2)
        .to.emit(erc20FlashBorrowerInstance, "BalanceOf")
        .withArgs(contractInstance.address, erc20FlashBorrowerInstance.address, borrowerInitialBalance + amount);
      await expect(tx2)
        .to.emit(erc20FlashBorrowerInstance, "TotalSupply")
        .withArgs(contractInstance.address, borrowerInitialBalance + amount + amount);

      const totalSupply = await contractInstance.totalSupply();
      expect(totalSupply).to.equal(amount + borrowerInitialBalance);

      const balanceOf3 = await contractInstance.balanceOf(erc20FlashBorrowerInstance.address);
      expect(balanceOf3).to.equal(borrowerInitialBalance - customFlashFee);

      const balanceOf4 = await contractInstance.balanceOf(feeReceiver);
      expect(balanceOf4).to.equal(customFlashFee);

      const allowance = await contractInstance.allowance(erc20FlashBorrowerInstance.address, contractInstance.address);
      expect(allowance).to.equal(0);
    });
  });
}
