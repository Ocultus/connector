import {Client} from 'pg';
import {
	GatewayCredentials,
	GatewayEntity,
	GatewayEntityRow,
	GatewayType,
} from '../entities/gateway.entity';

export class GatewayRepository {
	constructor(private readonly pg: Client) {}

	public findByType = async (
		type: GatewayType,
	): Promise<Array<GatewayEntity>> => {
		const gatewaysRaw = await this.pg.query<GatewayEntityRow>(`
    	SELECT * FROM gateway WHERE type = $1;
    `, [type]);
		const gateways = gatewaysRaw.rows;

		return gateways.map(
			({created_at, credentials, project_id, ...otherGatewayData}) => {
				return {
					createdAt: new Date(created_at),
					credentials: credentials as any,
					projectId: project_id,
					...otherGatewayData,
				};
			},
		);
	};

	public insertOne = async (
		projectId: number,
		credentialsWithType: GatewayCredentials,
	): Promise<void> => {
		const {type, credentials} = credentialsWithType;

		await this.pg.query<GatewayEntity>(`
      INSERT INTO gateway(project_id, type, credentials)
			VALUES ($1,$2,$3)
    `, [projectId, type, credentials]);
	};
}
