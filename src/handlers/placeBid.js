import AWS from "aws-sdk";
import commonMiddleware from "../lib/commonMiddleware.js";
import createError from "http-errors";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import { getAuctionById } from "./getAuction.js";
import validator from "@middy/validator";
import { transpileSchema } from "@middy/validator/transpile";
import placeBidSchema from "../lib/schemas/placeBidSchema.js";

const dynamoDB = new AWS.DynamoDB.DocumentClient();

async function placeBid(event, context) {
  const { id } = event.pathParameters;
  const { amount } = event.body;
  const { email } = event.requestContext.authorizer;

  const auction = await getAuctionById(id);

  if (auction.status === "CLOSED") {
    throw new createError.Forbidden(`This bid is CLOSED.`);
  }
  if (amount <= auction.highestBid.amount) {
    throw new createError.Forbidden(
      `Your bid must be higher than ${auction.highestBid.amount}.`
    );
  }
  if (email === auction.seller) {
    throw new createError.Forbidden(`You can't bid on your own auctions.`);
  }
  if (email === auction.highestBid.bidder) {
    throw new createError.Forbidden(`You are already the highest bidder.`);
  }

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id },
    UpdateExpression:
      "set highestBid.amount = :amount, highestBid.bidder = :bidder",
    ExpressionAttributeValues: {
      ":amount": amount,
      ":bidder": email,
    },
    ReturnValues: "ALL_NEW",
  };

  let updatedAuction;

  try {
    const result = await dynamoDB.update(params).promise();
    updatedAuction = result.Attributes;
  } catch (error) {
    console.log(error);
    throw new createError.InternalServerError(error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ updatedAuction }),
  };
}

export const handler = commonMiddleware(placeBid)
  .use(httpJsonBodyParser())
  .use(
    validator({
      eventSchema: transpileSchema(placeBidSchema),
    })
  );
