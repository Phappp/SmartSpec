interface UseCaseDiagramResponse {
  id: string;
  name: string;
  description: string;
  actors: any[];
  usecases: any[];
  associations: any[];
  relationships: any[];
  diagram_svg?: string;
  related_requirements: string[];
  linked_testcases: string[];
  created_by: string;
}
interface GenerateUsecaseDiagrambasePayload {
  versionId: string;
  projectId: string;
  requirements: any[];
  lang: string;
}
interface UseCaseDiagramService {
  generateSchemaFromRequirements(
    payload: GenerateUsecaseDiagrambasePayload,
    userId: string
  ): Promise<UseCaseDiagramResponse>;
}

export {
  UseCaseDiagramService,
  UseCaseDiagramResponse,
  GenerateUsecaseDiagrambasePayload,
};
