declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    query(text: string, params?: any[]): Promise<any>;
    end(): Promise<void>;
  }
}

declare module 'bcryptjs' {
  const bcrypt: {
    hash(value: string, rounds: number): Promise<string>;
    compare(value: string, hash: string): Promise<boolean>;
  };
  export = bcrypt;
}
