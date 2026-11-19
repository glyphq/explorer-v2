export type ContractProcedure = {
  inputType: number;
  name: string;
};

export type ContractSummary = {
  index: number;
  name: string;
  assetName: string;
  address: string;
  constructionEpoch: number | null;
  functionCount: number;
  notificationCount: number;
  procedures: ContractProcedure[];
};
