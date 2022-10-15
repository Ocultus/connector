export type Envelope = {
  account: number;
  payload: { text: string };
} & (
  | {
      type: "incoming";
      createdAt: string;
      sentAt: string;
    }
  | {
      type: "outgoing";
    }
);
