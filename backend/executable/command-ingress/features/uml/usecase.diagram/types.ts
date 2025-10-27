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
  getUsecaseDiagrams(): Promise<UseCaseDiagramResponse[]>;
  getUsecaseDiagramsById(
    ucId: string,
    versionId: string
  ): Promise<UseCaseDiagramResponse>;
  editActorById(
    ucId: string,
    versionId: string,
    actorId: string,
    data: any
  ): Promise<UseCaseDiagramResponse>;
  deleteActorById(
    ucId: string,
    versionId: string,
    actorId: string
  ): Promise<void>;
  editUsecaseById(
    ucId: string,
    versionId: string,
    usecaseId: string,
    data: any
  ): Promise<UseCaseDiagramResponse>;
  deleteUsecaseById(
    ucId: string,
    versionId: string,
    usecaseId: string
  ): Promise<void>;
  editRelationshipById(
    ucId: string,
    versionId: string,
    relationshipId: string,
    data: any
  ): Promise<UseCaseDiagramResponse>;
  deleteRelationshipById(
    ucId: string,
    versionId: string,
    relationshipId: string
  ): Promise<void>;
  editAssociationById(
    ucId: string,
    versionId: string,
    associationId: string,
    data: any
  ): Promise<UseCaseDiagramResponse>;
  deleteAssociationById(
    ucId: string,
    versionId: string,
    associationId: string
  ): Promise<void>;
}

export {
  UseCaseDiagramService,
  UseCaseDiagramResponse,
  GenerateUsecaseDiagrambasePayload,
};
