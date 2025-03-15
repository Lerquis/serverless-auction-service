import { getAuctionById } from "./getAuction.js";
import { uploadPictureToS3 } from "../lib/uploadPictureToS3.js";
import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import createError from "http-errors";
import { setAuctionPictureUrl } from "../lib/setAuctionPictureUrl.js";
import cors from "@middy/http-cors";

export async function uploadAuctionPicture(event) {
  const { id } = event.pathParameters;

  //? Obtenemos el email del JWT token
  const { email } = event.requestContext.authorizer;
  //? Obtenemos el auction
  const auction = await getAuctionById(id);

  //? Confirmamos que el usuario que sube la imagen, sea el vendedor de la subasta
  if (auction.seller !== email) {
    throw new createError.Forbidden("You are not the seller of this auction!");
  }

  //? Eliminamos texto de la imagen innecesario
  const base64 = event.body.replace(/^data:image\/\w+;base64,/, "");
  //? Convertimos la imagen a un buffer
  const buffer = Buffer.from(base64, "base64");

  let updatedAuction;

  try {
    const pictureUrl = await uploadPictureToS3(auction.id + ".jpg", buffer);

    //? Editamos el auction y le agregamos la imagen
    updatedAuction = await setAuctionPictureUrl(auction.id, pictureUrl);
  } catch (error) {
    console.log(error);
    throw new createError.InternalServerError(error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(updatedAuction),
  };
}

export const handler = middy(uploadAuctionPicture)
  .use(httpErrorHandler())
  .use(cors());
