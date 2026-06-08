import { Injectable } from '@nestjs/common';

export interface PromptTemplate {
  version: string;
  system: string;
  variables: string[];
}

@Injectable()
export class PromptRegistry {
  private templates: Map<string, PromptTemplate> = new Map();

  register(name: string, template: PromptTemplate): void {
    this.templates.set(name, template);
  }

  get(name: string): PromptTemplate | undefined {
    return this.templates.get(name);
  }

  getSystem(name: string): string {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Prompt template "${name}" not found`);
    }
    return template.system;
  }
}
