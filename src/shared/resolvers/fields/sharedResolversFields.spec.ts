import sinon from 'sinon';
import { expect } from 'chai';
import * as Sentry from '@sentry/node';
import { parseFieldToInt } from '../../../shared/resolvers/fields/PrismaBigInt';

describe('Shared Resolver Helpers', () => {
  let sentryStub;

  beforeEach(() => {
    sentryStub = sinon.stub(Sentry, 'captureException').resolves();
  });

  afterEach(() => {
    sentryStub.restore();
  });
  describe('PrismaBigInt Resolver - parseFieldToInt function', () => {
    it('should return null if field is string of chars', async () => {
      const itemId = 'abc';
      const resolvedValue = parseFieldToInt(itemId);
      expect(resolvedValue).to.be.null;
    });
    it('should return null if field is null', async () => {
      const itemId = null;
      const resolvedValue = parseFieldToInt(itemId);
      expect(resolvedValue).to.be.null;
    });
    it('should successfully resolve value to int', async () => {
      const itemId = '12345';
      const resolvedValue = parseFieldToInt(itemId);
      expect(resolvedValue).to.equal(parseInt(itemId));
    });
  });
});
