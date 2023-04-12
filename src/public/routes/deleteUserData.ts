import { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { checkSchema, Schema, validationResult } from 'express-validator';
// Uncomment for OSL-386, log to Sentry when failed delete from DB
// import * as Sentry from '@sentry/node';
// import { client } from '../../database/client';
import { nanoid } from 'nanoid';

const router = Router();
// Uncomment for OSL-386, connection to db
// const db = client();

const deleteUserDataSchema: Schema = {
  traceId: {
    in: ['body'],
    optional: true,
    isString: true,
    notEmpty: true,
  },
  userId: {
    in: ['body'],
    errorMessage: 'Must provide valid userId',
    isInt: true,
    toInt: true,
  },
};

export function validate(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ errors: errors.array() })
      .setHeader('Content-Type', 'application/json');
  }
  next();
}

router.post(
  '/',
  checkSchema(deleteUserDataSchema),
  validate,
  (req: Request, res: Response) => {
    const requestId = req.body.traceId ?? nanoid();
    const userId = req.body.userId;

    // TODO: OSL-386 -- delete all shareable lists daa for userId from DB
    // Add tests

    return res.send({
      status: 'OK',
      message: `Deleting User Data: Deleting shareable lists data for User ID: ${userId} (requestId='${requestId}')`,
    });
  }
);

export default router;
