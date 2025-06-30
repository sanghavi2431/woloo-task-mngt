import express from 'express';
import httpStatusCodes from 'http-status-codes';
import apiResponse from '../utilities/ApiResponse';
import Encryption from '../utilities/Encryption';
import { extractCookieFromRequest } from '../utilities/ApiUtilities';
import application from '../Constants/application';
import { permission } from '../Constants/Common/permission';
import { Request, Response } from 'express';

/**
 * Route authentication middleware to verify a token
 *
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 */

export default async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (application.authorizationIgnorePath.indexOf(
    //@ts-ignore
    `${req._parsedUrl.pathname}`
  ) === -1
  ) {
    if (req.path === '/api/whms/logs') {
      return next(); // Allow access without authentication
  }
    const authorizationHeader = extractCookieFromRequest(req, 'x-woloo-token');
    console.log("authorizationHeader ->", authorizationHeader);
    const apiKey: string | string[] | undefined | null = extractCookieFromRequest(req, 'x-api-key');
    if (authorizationHeader) {
      const decoded = await new Encryption().verifyJwtToken(authorizationHeader);
      console.log("Decoded -", decoded)
      if(new Date(decoded?.exp * 1000) <= new Date(Date.now())){
        apiResponse.error(res, httpStatusCodes.UNAUTHORIZED);
        return;
      }
      // @ts-ignore
      if (decoded && req.headers["tenant-id"] == decoded.tenant_id) {
        // @ts-ignore
        req.session = decoded;
        console.log('TOKEN ---> Verified Successfully');
        if (req.headers['user-agent'] !== "Browser") {
          // @ts-ignore
          let isRoleVerified = verifyRole(req._parsedUrl.pathname, decoded.role_id)
          if (!isRoleVerified) return apiResponse.error(res, httpStatusCodes.FORBIDDEN, "Access to the requested resource is forbidden");
        }
      } else {
        apiResponse.error(res, httpStatusCodes.UNAUTHORIZED);
        return;
      }
    }
    else if (apiKey) {
      console.log("API",apiKey,req.originalUrl)
      if (apiKey === 'eHDgroph0FZW7zMAkByPXrZykkE69SlH' && req.originalUrl == "/api/whms/iot/insertDevicePayload") {

      }
      if (apiKey === 'eHDgroph0FZW7zMAkByPXrZykkE69SlH' && req.originalUrl == "/api/whms/iot/insertDevicePayloadVendor") {

      }
      else if (apiKey === 'k45GQj8FtKt0NR074UfFyvCEPAfJBzxY' && req.originalUrl == "/api/whms/clients/clientSignUp") {
      }
      else if (apiKey === 'k45GQj8FtKt0NR074UfFyvCEPAfJBzxY' && req.originalUrl == "/api/whms/clients/CheckUserLoginPermission") {
      }
      else {
        apiResponse.error(res, httpStatusCodes.FORBIDDEN);
        return;
      }
    }
    else {
      apiResponse.error(res, httpStatusCodes.FORBIDDEN);
      return;
    }
  }

  next();
};

const verifyRole = (path: string, role_id: any) => {
  return true
  const isAccessible = permission();
  const isPathExist = isAccessible[path];
  if (isPathExist?.roles?.includes(role_id)) {
    return true
  }
  return false
}
