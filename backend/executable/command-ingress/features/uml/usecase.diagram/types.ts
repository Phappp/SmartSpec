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
  getUsecaseDiagrams(versionId: string): Promise<UseCaseDiagramResponse[]>;
  getUsecaseDiagramsById(
    ucId: string,
  ): Promise<UseCaseDiagramResponse>;
  editActorById(
    ucId: string,
    actorId: string,
    data: {name: string; description?: string;}
  ): Promise<UseCaseDiagramResponse>;
  deleteActorById(
    ucId: string,
    actorId: string
  ): Promise<void>;
  editUsecaseById(
    ucId: string,
    usecaseId: string,
    data: {title: string; description?: string;}
  ): Promise<UseCaseDiagramResponse>;
  deleteUsecaseById(
    ucId: string,
    usecaseId: string
  ): Promise<void>;
  editRelationshipById(
    ucId: string,
    relationshipId: string,
    data: {source: string; target: string; type: string;}
  ): Promise<UseCaseDiagramResponse>;
  deleteRelationshipById(
    ucId: string,
    relationshipId: string
  ): Promise<void>;
  editAssociationById(
    ucId: string,
    associationId: string,
    data: {actor_id: string; usecase_id: string;}
  ): Promise<UseCaseDiagramResponse>;
  deleteAssociationById(
    ucId: string,
    associationId: string
  ): Promise<void>;
}

export {
  UseCaseDiagramService,
  UseCaseDiagramResponse,
  GenerateUsecaseDiagrambasePayload,
};
