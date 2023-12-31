import {
  Account,
  DynamicPaymentRequestJobsStatus,
  PaymentIntentRow,
  PaymentIntentStatus,
  Pricing,
} from "../enums.ts";
import {
  ChainIds,
  getCurrenciesForNetworkName,
  NetworkNames,
  SelectableCurrency,
} from "../shared/web3.ts";
import {
  getAuthenticationOptions,
  getAuthenticationOptionsWithLargeBlobRead,
  getAuthenticationOptionsWithLargeBlobWrite,
  getRegistrationOptions,
  getRegistrationOptionsWithLargeBlob,
  PasskeyUserModel,
} from "../webauthn/backend.ts";
import QueryBuilder from "./db/queryBuilder.ts";
import { getEmailByUserId } from "./db/rpc.ts";
import {
  selectAccountAuthenticatorByCredentialId,
  selectAllAccountAuthenticatorsByUserId,
} from "./db/tables/AccountAuthenticators.ts";
import { selectAllAuthenticatorsByUserId } from "./db/tables/Authenticators.ts";
import {
  insertNewChallenge,
  selectCurrentUserChallenge,
  updateUserChallengeByUserId,
} from "./db/tables/UserChallenges.ts";
import { getAccount, getProvider, parseEther } from "./web3.ts";

async function setResettablePaymentIntents(
  update: any,
  resetablePaymentIntents: PaymentIntentRow[],
) {
  for (let i = 0; i < resetablePaymentIntents.length; i++) {
    const piToReset = resetablePaymentIntents[i];
    if (piToReset.used_for === 0) {
      // Set to created!
      await update.PaymentIntents.statusByPaymentIntent(
        PaymentIntentStatus.CREATED,
        piToReset.paymentIntent,
      );
    } else {
      // set to recurring!
      await update.PaymentIntents.statusByPaymentIntent(
        PaymentIntentStatus.RECURRING,
        piToReset.paymentIntent,
      );
    }
  }
}

/**
 * increase the gas limit by 30 percent to make sure the value we use is enough!
 * @param estimatedGasLimit
 * @returns bigint
 */

export const increaseGasLimit = (estimatedGasLimit: bigint) => {
  return (estimatedGasLimit * BigInt(130)) / BigInt(100); // increase by 30%
};

/**
 *  get the gas price for the chainId
 * @param chainId
 * @returns feeData
 */

export async function getGasPrice(chainId: ChainIds) {
  const provider = getProvider(chainId);

  const feeData = await provider.getFeeData();

  return {
    gasPrice: feeData.gasPrice,
    maxFeePerGas: feeData.maxFeePerGas === null
      ? BigInt(0)
      : feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas === null
      ? BigInt(0)
      : feeData.maxPriorityFeePerGas,
  };
}

function findPaymentIntentsWithAccountBalanceLowThatCanBeReset(
  currentBalance: bigint,
  paymentIntents: PaymentIntentRow[],
) {
  const paymentIntentsToReset = Array<any>();

  let addedBalanceLeft = currentBalance;

  for (let i = 0; i < paymentIntents.length; i++) {
    const pi = paymentIntents[i];
    if (pi.pricing === Pricing.Fixed) {
      // with fixed pricing I consider the maxDebitAmount
      const maxDebitAmount = parseEther(pi.maxDebitAmount);
      if (addedBalanceLeft - maxDebitAmount >= 0) {
        paymentIntentsToReset.push(pi);
        addedBalanceLeft -= maxDebitAmount;
      }
    } else {
      // with dynamic pricing I use failedDynamicPaymentAmount,
      // a value the relayer saved in the db
      const failedDynamicPaymentAmount = parseEther(
        pi.failedDynamicPaymentAmount,
      );
      if (addedBalanceLeft - failedDynamicPaymentAmount >= 0) {
        paymentIntentsToReset.push(pi);
        addedBalanceLeft -= failedDynamicPaymentAmount;
      }
    }
  }
  return paymentIntentsToReset;
}

//This should work based on current on-chain balance and not how much balance was added!
export async function updatePaymentIntentsWhereAccountBalanceWasAdded(
  queryBuilder: QueryBuilder,
  currentOnChanBalance_WEI: any,
  account_id: number,
) {
  if (currentOnChanBalance_WEI === BigInt(0)) {
    // Account was closed or it's just empty!
    return;
  }
  const select = queryBuilder.select();
  const { data: paymentIntents } = await select.PaymentIntents
    .forAccountbyAccountBalanceTooLow(
      account_id,
    );

  const paymentIntentsToReset =
    findPaymentIntentsWithAccountBalanceLowThatCanBeReset(
      currentOnChanBalance_WEI,
      paymentIntents,
    );
  //Update payment intents
  const update = queryBuilder.update();
  for (let i = 0; i < paymentIntentsToReset.length; i++) {
    const piToReset = paymentIntentsToReset[i];
    if (piToReset.used_for === 0) {
      // Set to created!
      await update.PaymentIntents.updateForAccountBalanceNotLowAnymore(
        PaymentIntentStatus.CREATED,
        piToReset,
      );
    } else {
      // set to recurring!
      await update.PaymentIntents.updateForAccountBalanceNotLowAnymore(
        PaymentIntentStatus.RECURRING,
        piToReset,
      );
    }
  }
}

export const getPagination = (page: number, size: number) => {
  const limit = size ? +size : 3;
  const from = page ? page * limit : 0;
  const to = page ? from + size - 1 : size - 1;

  return { from, to };
};

export const getTotalPages = (rowCount: number, pageSize: number) => {
  if (rowCount === 0) {
    return 1;
  }

  const precision = 1000;
  const paddedRowCount = BigInt(rowCount * precision);

  const divided = paddedRowCount / BigInt(pageSize);

  const unpadded = Number(divided) / precision;

  const split = unpadded.toString().split(".");

  if (split[0] === "0") {
    return 1;
  }

  if (split[1] === undefined) {
    return parseInt(split[0]);
  }

  return parseInt(split[0]) + 1;
};

export async function refreshDBBalance(
  data: Array<Account>,
  commitment: string,
  queryBuilder: QueryBuilder,
) {
  const update = queryBuilder.update();

  const networkId = data[0].network_id;

  const onChainAccount = await getAccount(
    commitment,
    networkId,
    data[0].accountType,
  );

  // If account on chain is active but the balance is not the same as the balance I saved
  if (
    onChainAccount.account[0] &&
    parseEther(data[0].balance) !== onChainAccount.account[3]
  ) {
    //Check if there were payment intents with account balance too low and
    // calculate how much balance was added and set them to recurring or created where possible
    await updatePaymentIntentsWhereAccountBalanceWasAdded(
      queryBuilder,
      onChainAccount.account[3],
      data[0].id,
    );

    // Update the account balance finally

    await update.Accounts.balanceAndClosedById(
      onChainAccount.account[3],
      !onChainAccount.account[0],
      data[0].id,
    );
  }

  // If account is not active but the data saved in teh db (closed) is still false
  // This is a separate condition to handle edge case when an empty account is closed, we don't check balance!
  if (!onChainAccount.account[0] && !data[0].closed) {
    await update.Accounts.balanceAndClosedById(
      onChainAccount.account[3],
      !onChainAccount.account[0],
      data[0].id,
    );

    // I need to void all payment intents that are not paid or cancelled!
    // This will only void them in the database, but the proofs are already unusable since the account is not active anymore!
    await update.PaymentIntents.toCancelledByAccountIdForCreator(data[0].id);
  }

  return onChainAccount;
}

export async function addDynamicPaymentRequest(
  paymentIntent: string,
  queryBuilder: QueryBuilder,
  requestedDebitAmount: string,
) {
  const select = queryBuilder.select();

  const { data: paymentIntentDataArray } = await select.PaymentIntents
    .byPaymentIntentAndUserIdForPayee(paymentIntent);

  if (paymentIntentDataArray === null || paymentIntentDataArray.length === 0) {
    throw new Error("Invalid Payment Intent");
  }
  const paymentIntentData: PaymentIntentRow = paymentIntentDataArray[0];
  if (
    parseEther(requestedDebitAmount) >
      parseEther(paymentIntentData.maxDebitAmount)
  ) {
    throw new Error("Requested Amount Too High!");
  }

  if (paymentIntentData.pricing !== Pricing.Dynamic) {
    throw new Error("Only accepting dynamic priced payment intents!");
  }

  if (parseEther(requestedDebitAmount) <= 0) {
    throw new Error("Zero or negative payments are not accepted!");
  }

  if (
    paymentIntentData.nextPaymentDate !== null &&
    new Date().getTime() < new Date(paymentIntentData.nextPaymentDate).getTime()
  ) {
    // If next payment date is set, I check if the current date exceeds it or not.
    // If not, then it might be too early to send this transaction and it would fail...
    throw new Error(
      "Payment not due! Check next payment date. If you try to debit too early the transaction will fail!",
    );
  }

  const currency: SelectableCurrency = JSON.parse(paymentIntentData.currency);

  if (parseEther(requestedDebitAmount) < parseEther(currency.minimumAmount)) {
    throw new Error("Unable to request lower than minimum!");
  }

  const { data: dynamicPaymentRequestJobDataArr } = await select
    .DynamicPaymentRequestJobs
    .byPaymentIntentIdAndUserId(paymentIntentData.id);

  const insert = queryBuilder.insert();
  const update = queryBuilder.update();
  let id;
  if (
    dynamicPaymentRequestJobDataArr === null ||
    dynamicPaymentRequestJobDataArr.length === 0
  ) {
    // I need to insert an new job!
    const insertedRequestRes = await insert.DynamicPaymentRequestJobs.newJob(
      paymentIntentData.id,
      requestedDebitAmount,
    );
    id = insertedRequestRes.data[0].id;
  } else {
    if (
      dynamicPaymentRequestJobDataArr[0].status ===
        DynamicPaymentRequestJobsStatus.LOCKED
    ) {
      throw new Error(
        "Payment request is locked. You can't update it anymore!",
      );
    }

    // I update the existing job!
    const updateedRequestRes = await update.DynamicPaymentRequestJobs
      .ByPaymentIntentIdAndRequestCreator(
        paymentIntentData.id,
        requestedDebitAmount,
      );

    id = updateedRequestRes.data[0].id;
  }

  if (
    parseEther(requestedDebitAmount) >
      parseEther(paymentIntentData.account_id.balance)
  ) {
    await update.PaymentIntents.statusTextToAccountBalanceTooLowById(
      paymentIntentData,
    );
    return {
      msg:
        "Request Created but customer balance too low! We notified the customer about the pending payment!",
      id,
    };
  }

  return { msg: "Request Created!", id };
}

export async function cancelDynamicPaymentRequestLogic(
  requestId: number,
  queryBuilder: QueryBuilder,
) {
  const deleteQ = queryBuilder.delete();
  // this will delete the row by id if it was created by the user and the row is not locked!
  const result = await deleteQ.DynamicPaymentRequestJobs.byIdForRequestCreator(
    requestId,
  );

  if (result.error !== null) {
    throw new Error("Unable to delete Payment Request!");
  } else {
    return "Deleted Payment Request! The page will refresh in 10 seconds!";
  }
}

export async function registerAuthenticatorGET(
  ctx: any,
  userid: string,
) {
  //TODO: Refactor to 1 RPC call
  const { data: userChallenge } = await selectCurrentUserChallenge(ctx, {});

  if (userChallenge.length === 0) {
    const { data: emailData } = await getEmailByUserId(ctx, {
      userid,
    });
    const email = emailData[0].email;

    // No challenge was saved yet, I will do insert
    const userModel: PasskeyUserModel = {
      id: userid,
      username: email,
      currentChallenge: "",
    };
    // There are no authenticators saved if there was no challenge yet!
    const options = await getRegistrationOptions(userModel, []);
    await insertNewChallenge(ctx, { challenge: options.challenge, email });

    return options;
  } else {
    // I need to update the existing challenge
    const { data: userChallengeModel } = await selectCurrentUserChallenge(
      ctx,
      {},
    );
    const userModel: PasskeyUserModel = {
      id: userid as string,
      username: userChallengeModel[0].email,
      currentChallenge: userChallengeModel[0].currentChallenge,
    };
    const { data: authenticators } = await selectAllAuthenticatorsByUserId(
      ctx,
      {},
    );

    const options = await getRegistrationOptions(userModel, authenticators);

    await updateUserChallengeByUserId(ctx, { challenge: options.challenge });

    return options;
  }
}

export async function authenticationVerifyGET(
  ctx: any,
) {
  //TODO: refactor these 2 to 1 RPC call
  const { data: userChallenge } = await selectCurrentUserChallenge(ctx, {});

  if (userChallenge.length === 0) {
    return [false, null];
  }

  const { data: authenticators } = await selectAllAuthenticatorsByUserId(
    ctx,
    {},
  );

  if (authenticators.length === 0) {
    return [false, null];
  }
  const options = await getAuthenticationOptions(authenticators);
  await updateUserChallengeByUserId(ctx, { challenge: options.challenge });

  return [true, options];
}

export async function registerAuthenticatorGETForAccount(
  ctx: any,
  userid: string,
) {
  //TODO: Refactor to 1 RPC call
  const { data: userChallenge } = await selectCurrentUserChallenge(ctx, {});

  if (userChallenge.length === 0) {
    const { data: emailData } = await getEmailByUserId(ctx, {
      userid,
    });
    const email = emailData[0].email;

    // No challenge was saved yet, I will do insert
    const userModel: PasskeyUserModel = {
      id: userid,
      username: email,
      currentChallenge: "",
    };
    // There are no authenticators saved if there was no challenge yet!
    const options = await getRegistrationOptionsWithLargeBlob(userModel, []);
    await insertNewChallenge(ctx, { challenge: options.challenge, email });

    return options;
  } else {
    // I need to update the existing challenge
    const { data: userChallengeModel } = await selectCurrentUserChallenge(
      ctx,
      {},
    );
    const userModel: PasskeyUserModel = {
      id: userid as string,
      username: userChallengeModel[0].email,
      currentChallenge: userChallengeModel[0].currentChallenge,
    };

    const { data: authenticators } =
      await selectAllAccountAuthenticatorsByUserId(
        ctx,
        {},
      );

    const options = await getRegistrationOptionsWithLargeBlob(
      userModel,
      authenticators,
    );
    await updateUserChallengeByUserId(ctx, { challenge: options.challenge });

    return options;
  }
}

export async function account_AuthenticationLargeBlobWrite(
  ctx: any,
  credentialID: string,
) {
  //TODO: refactor these 2 to 1 RPC call
  const { data: userChallenge } = await selectCurrentUserChallenge(ctx, {});

  if (userChallenge.length === 0) {
    return [false, null];
  }

  const { data: authenticators } =
    await selectAccountAuthenticatorByCredentialId(ctx, {
      credentialID,
    });

  if (authenticators.length === 0) {
    return [false, null];
  }

  const options = await getAuthenticationOptionsWithLargeBlobWrite(
    authenticators,
  );
  await updateUserChallengeByUserId(ctx, { challenge: options.challenge });

  return [true, options];
}

export async function account_AuthenticationLargeBlobRead(
  ctx: any,
) {
  //TODO: refactor these 2 to 1 RPC call
  const { data: userChallenge } = await selectCurrentUserChallenge(ctx, {});

  if (userChallenge.length === 0) {
    return [false, null];
  }

  const { data: authenticators } = await selectAllAccountAuthenticatorsByUserId(
    ctx,
    {},
  );

  if (authenticators.length === 0) {
    return [false, null];
  }

  const options = await getAuthenticationOptionsWithLargeBlobRead(
    authenticators,
  );
  await updateUserChallengeByUserId(ctx, { challenge: options.challenge });

  return [true, options];
}

export function parseCurrencyForValidation(
  currency: string,
  network: NetworkNames,
  maxAmount: string,
) {
  const parsedCurrency = JSON.parse(currency) as SelectableCurrency;

  const name = parsedCurrency.name;
  const native = parsedCurrency.native;
  const contractAddress = parsedCurrency.contractAddress;
  const minimumAmount = parsedCurrency.minimumAmount;
  const chainCurrencies = getCurrenciesForNetworkName[network];
  //Verify the passed in currency object is valid
  const findSubmittedCurrency = chainCurrencies.filter(
    (curr) =>
      curr.name === name &&
      curr.native === native &&
      curr.contractAddress === contractAddress &&
      curr.minimumAmount === minimumAmount,
  );

  console.log(findSubmittedCurrency);

  if (findSubmittedCurrency.length !== 1) {
    throw new Error("Invalid currency object params");
  }
  if (parseFloat(minimumAmount) > parseFloat(maxAmount)) {
    // Invalid amount, maxAmount should be bigger or equal the minimum!
    throw new Error("maxAmount under minimum");
  }
}

export function parseCurrencyForValidation_APIV1(
  currency: string,
  network: NetworkNames,
  maxAmount: string,
) {
  const parsedCurrency = JSON.parse(currency) as SelectableCurrency;

  const name = parsedCurrency.name;
  const native = parsedCurrency.native;
  const contractAddress = parsedCurrency.contractAddress;

  const chainCurrencies = getCurrenciesForNetworkName[network];

  //Verify the passed in currency object is valid
  const findSubmittedCurrency = chainCurrencies.filter(
    (curr) =>
      curr.name === name &&
      curr.native === native &&
      curr.contractAddress === contractAddress,
  );

  if (findSubmittedCurrency.length !== 1) {
    throw new Error("Invalid currency object params");
  }

  if (
    parseFloat(findSubmittedCurrency[0].minimumAmount) > parseFloat(maxAmount)
  ) {
    // Invalid amount, maxAmount should be bigger or equal the minimum!
    throw new Error(
      `maxAmount < ${
        findSubmittedCurrency[0].minimumAmount
      } ${name}`,
    );
  }
}
