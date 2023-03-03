import {BaseEntity, BaseEntityRow} from './base.entity';

type EmployeeBaseEntity = {
	email: string;
	name: string;
	status: 'online' | 'offline';
};

export type EmployeeEntity = BaseEntity & EmployeeBaseEntity;
export type EmployeeEntityRow = BaseEntityRow & EmployeeBaseEntity;
