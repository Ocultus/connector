import {TRPCError} from '@trpc/server';
import {IdInput} from '../routes/types/base.input';
import {middleware} from '../trpc/middleware';
import {GatewayRepository} from '../repository/gateway.repository';

export const isUserGetawayGuard = middleware(async opts => {
	const {
		ctx: {db, user},
		next,
		rawInput,
	} = opts;

	const result = IdInput.safeParse(rawInput);
	if (!result.success || !user) {
		throw new TRPCError({code: 'BAD_REQUEST'});
	}

	const customerId = user.id;
	const getawayId = result.data.id;
	const isCustomerGetaway = await GatewayRepository.checkIsCustomerGetaway(
		db,
		getawayId,
		customerId,
	);
	if (!isCustomerGetaway) {
		throw new TRPCError({code: 'FORBIDDEN', message: ''});
	}

	return next();
});
