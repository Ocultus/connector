import {TRPCError} from '@trpc/server';
import {IdInput} from '../routes/types/base.input';
import {middleware} from '../trpc/middleware';
import {GatewayRepository} from '../repository/gateway.repository';

export const isCustomerGatewayGuard = middleware(async opts => {
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
	const gatewayId = result.data.id;
	const isCustomerGateway = await GatewayRepository.checkCustomerIdentity(
		db,
		gatewayId,
		customerId,
	);
	if (!isCustomerGateway) {
		throw new TRPCError({code: 'FORBIDDEN', message: ''});
	}

	return next();
});
