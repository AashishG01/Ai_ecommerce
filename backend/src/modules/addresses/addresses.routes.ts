/**
 * Address routes — all require authentication.
 */
import { Router } from 'express';
import * as controller from './addresses.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { createAddressSchema, updateAddressSchema } from './addresses.schema';

const router = Router();

router.use(authenticate);

router.get('/', controller.getAddresses);
router.post('/', validate(createAddressSchema, 'body'), controller.createAddress);
router.patch('/:id', validate(updateAddressSchema, 'body'), controller.updateAddress);
router.delete('/:id', controller.deleteAddress);

export default router;
