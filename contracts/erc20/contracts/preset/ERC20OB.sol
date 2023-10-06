// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import "@gemunion/contracts-erc1363/contracts/extensions/ERC1363.sol";

contract ERC20OB is Ownable, ERC165, ERC20Burnable, ERC1363 {
  constructor(string memory name, string memory symbol) ERC20(name, symbol) Ownable(_msgSender()) {}

  function mint(address to, uint256 amount) public virtual onlyOwner {
    _mint(to, amount);
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, ERC1363) returns (bool) {
    return
      interfaceId == type(IERC20).interfaceId ||
      interfaceId == type(IERC20Metadata).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
