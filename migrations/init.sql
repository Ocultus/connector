CREATE OR REPLACE FUNCTION refresh_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS customer(
    id SERIAL CONSTRAINT "customer_pk" PRIMARY KEY,
    name VARCHAR,
    email VARCHAR NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_email_idx" ON customer USING btree (email);

CREATE TYPE gateway_type AS ENUM ('tg','vk');

CREATE TABLE IF NOT EXISTS gateway (
    id SERIAL CONSTRAINT "gateway_pk" PRIMARY KEY,
    name VARCHAR NOT NULL,
    customer_id SERIAL NOT NULL REFERENCES customer(id),
    credentials jsonb NOT NULL UNIQUE,
    type gateway_type NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client (
    id SERIAL CONSTRAINT "client_pk" PRIMARY KEY,
    social_network gateway_type NOT NULL,
    external_id SERIAL NOT NULL,
    name VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS client_identity ON client(external_id, social_network)

CREATE TABLE IF NOT EXISTS chat (
    id SERIAL CONSTRAINT "chat_pk" PRIMARY KEY,
    client_id SERIAL NOT NULL CONSTRAINT client_id_fk REFERENCES client ON UPDATE cascade ON DELETE CASCADE,
    gateway_id SERIAL NOT NULL CONSTRAINT gateway_id_fk REFERENCES gateway,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TYPE message_type_enum as ENUM ('incoming','outgoing');

CREATE TABLE IF NOT EXISTS message (
    id SERIAL CONSTRAINT "message_pk" PRIMARY KEY,
    parent_id INT DEFAULT NULL,
    external_id SERIAL NOT NULL,
    chat_id SERIAL REFERENCES chat(id),
    payload jsonb NOT NULL,
    type message_type_enum NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TYPE request_type_enum as ENUM ('open','pending','closed');

CREATE TABLE IF NOT EXISTS request (
    id SERIAL CONSTRAINT "request_pk" PRIMARY KEY,
    gateway_id SERIAL NOT NULL CONSTRAINT request_gateway_id REFERENCES gateway ON UPDATE CASCADE ON DELETE CASCADE,
    chat_id SERIAL NOT NULL CONSTRAINT chat_id_fk REFERENCES chat ON UPDATE CASCADE ON DELETE CASCADE,
    type request_type_enum NOT NULL DEFAULT 'open',
    updated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER refresh_updated_at_column_request
    BEFORE UPDATE
    ON request
    FOR EACH ROW
EXECUTE PROCEDURE refresh_updated_at_column();
