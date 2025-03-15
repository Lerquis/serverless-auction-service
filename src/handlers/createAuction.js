import { v4 as uuid } from "uuid";
import AWS from "aws-sdk";
import commonMiddleware from "../lib/commonMiddleware.js";
import createError from "http-errors";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import validator from "@middy/validator";
import { transpileSchema } from "@middy/validator/transpile";
import createAuctionSchema from "../lib/schemas/createAuctionSchema.js";

const dynamoDB = new AWS.DynamoDB.DocumentClient();

//? event tiene toda la informacion de la peticion, context tiene la informacion pasada por el lambda.
//? a ambos se les puede pasar informacion personalizada mediante middlewares.
async function createAuction(event, context) {
  //? no tenemos que hacer un JSON.parse porque el middleware httpJsonBodyParser ya lo hizo por nosotros.
  const { title } = event.body;

  //? De aca obtenemos toda la informacion dada por el JWT / Authorizer.
  const { email } = event.requestContext.authorizer;
  const endDate = new Date();
  endDate.setHours(endDate.getHours() + 1);

  const auction = {
    id: uuid(),
    title,
    status: "OPEN",
    createdAt: new Date().toISOString(),
    endingAt: endDate.toISOString(),
    highestBid: {
      amount: 0,
    },
    seller: email,
  };

  try {
    await dynamoDB
      .put({
        TableName: process.env.AUCTIONS_TABLE_NAME,
        Item: auction,
      })
      .promise();
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }

  return {
    statusCode: 201,
    body: JSON.stringify({ auction }),
  };
}

export const handler = commonMiddleware(createAuction)
  .use(httpJsonBodyParser())
  .use(
    validator({
      eventSchema: transpileSchema(createAuctionSchema),
    })
  );
