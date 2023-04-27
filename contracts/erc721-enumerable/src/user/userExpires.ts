import { expect } from "chai";
import { ethers, web3 } from "hardhat";
import { Contract } from "ethers";
import { time } from "@openzeppelin/test-helpers";
import { TMintERC721EnumFn } from "../shared/interfaces/IMintERC721EnumFn";
import { defaultMintERC721Enum } from "../shared/defaultMintERC721Enum";

export function shouldUserExprires(factory: () => Promise<Contract>, mint: TMintERC721EnumFn = defaultMintERC721Enum) {
  describe("userExprires", function () {
    it("should return expiration time of user", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address);

      const current = await time.latest();
      const deadline = current.add(web3.utils.toBN(1000));
      // await time.increaseTo(current.add(web3.utils.toBN(2000)));

      await contractInstance.setUser(0, receiver.address, deadline.toString());
      const userExpires = await contractInstance.userExpires(0);
      expect(userExpires).to.be.equal(deadline.toString());
    });
  });
}
