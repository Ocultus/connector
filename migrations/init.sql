CREATE OR REPLACE FUNCTION refresh_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

 
CREATE TABLE customer(
    id SERIAL CONSTRAINT "customer_pk" PRIMARY KEY,
    name VARCHAR,
    email VARCHAR NOT NULL,
    password TEXT NOT NULL
);

CREATE UNIQUE INDEX "customer_email_idx" ON customer USING btree (email);

CREATE TYPE gateway_type_enum AS ENUM ('tg','vk');

CREATE TABLE gateway (
    id SERIAL CONSTRAINT "gateway_pk" PRIMARY KEY,
    project_id INT NOT NULL CONSTRAINT  project_id_fk REFERENCES project ON UPDATE cascade ON DELETE cascade,
    credentials jsonb NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    type gateway_type_enum NOT NULL,
    enabled boolean NOT NULL DEFAULT true
);

CREATE TABLE client (
    id SERIAL CONSTRAINT "client_pk" PRIMARY KEY,
    external_id INT NOT NULL,
    name VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "client_external_id_idx" ON client USING btree (external_id);

CREATE TABLE chat (
    id SERIAL CONSTRAINT "chat_pk" PRIMARY KEY,
    client_id INT NOT NULL CONSTRAINT client_id_fk REFERENCES client ON UPDATE cascade ON DELETE cascade,
    gateway_id INT NOT NULL CONSTRAINT gateway_id_fk REFERENCES gateway ON UPDATE cascade ON DELETE cascade,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "chat_idx" ON chat USING btree (client_id,gateway_id);

CREATE TYPE message_type_enum as ENUM ('incoming','outgoing');

CREATE TABLE message (
    id SERIAL CONSTRAINT "message_pk" PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    parent_id INT REFERENCES message(id),
    chat_id INT REFERENCES chat(id),
    payload jsonb NOT NULL,
    type message_type_enum NOT NULL
);

CREATE TYPE request_type_enum as ENUM ('open','pending','closed');

CREATE TABLE request (
    id SERIAL CONSTRAINT "request_pk" PRIMARY KEY,
    chat_id INT NOT NULL CONSTRAINT chat_id_fk REFERENCES chat ON UPDATE cascade ON DELETE cascade,
    type request_type_enum NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP
);

CREATE TRIGGER refresh_updated_at_column_request
    BEFORE UPDATE
    ON request
    FOR EACH ROW
EXECUTE PROCEDURE refresh_updated_at_column();
