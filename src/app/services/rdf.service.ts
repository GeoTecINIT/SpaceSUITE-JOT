import { Injectable } from '@angular/core';
import {
  Competence,
  Field
} from '../models/occupationalProfile';
import { JobOffer } from '../models/jobOffer';
import { Language } from '../models/jobOfferDB';

@Injectable({
  providedIn: 'root',
})
export class RdfService {
  /* ============================
     Public API
     ============================ */

  getRdfTtlUrl(model: JobOffer): string {
    const blob = new Blob([this.convertModelToTurtle(model)], {
      type: 'text/ttl',
    });
    return window.URL.createObjectURL(blob);
  }

  getRdfXmlUrl(model: JobOffer): string {
    const blob = new Blob([this.convertModelToRdfXml(model)], {
      type: 'text/xml',
    });
    return window.URL.createObjectURL(blob);
  }

  getRdfaUrl(model: JobOffer): string {
    const blob = new Blob([this.convertModelToRDFa(model)], {
      type: 'text/html',
    });
    return window.URL.createObjectURL(blob);
  }

  /* ============================
     Turtle
     ============================ */

  private convertModelToTurtle(model: JobOffer): string {
    let additionalObjects = '';

    let ttl = `@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix elm: <http://data.europa.eu/snb/model/elm> .
@prefix geospacebok: <https://geospacebok.eu/> .
@prefix esco: <http://data.europa.eu/esco/model#> .

`;

    ttl += `geospacebok:JobOffer rdf:type rdfs:Class .\n`;

    ttl += `<https://geospacebok.eu/ocuprofiles/${model._id}> a geospacebok:JobOffer ;\n`;

    if (model.title) ttl += `  dcterms:title "${this.escape(model.title)}" ;\n`;

    if (model.description)
      ttl += `  dcterms:description "${this.escape(model.description)}" ;\n`;

    if (model.additionalQuestions)
      ttl += `  rdfs:comment "${this.escape(model.additionalQuestions)}" ;\n`;

    if (model.orgName)
      ttl += `  dcterms:publisher "${this.escape(model.orgName)}${model.division ? ' - ' + this.escape(model.division) : ''}"  ;\n`;

    if (model.updatedAt)
      ttl += `  dcterms:modified "${model.updatedAt instanceof Date ? model.updatedAt.toISOString() : model.updatedAt.toDate().toISOString()}" ;\n`;

    if (model.contactDetails)
      ttl += `  rdfs:seeAlso "${this.escape(model.contactDetails)}" ;\n`;

    if (model.salaryMin || model.salaryMax) {
      ttl += `  rdfs:comment "Annual salary: ${model.salaryMin} - ${model.salaryMax}${model.currency ? ' ' + model.currency : ''}" ;\n`;
    }

    if (model.yearsExperience) {
      ttl += `  dcterms:requires "${model.yearsExperience} years of experience" ;\n`;
    }

    if (model.dedication) {
      ttl += `  dcterms:type "${this.escape(model.dedication)}" ;\n`;
    }

    if (model.typeContract) {
      ttl += `  dcterms:type "${this.escape(model.typeContract)}" ;\n`;
    }

    if (model.languages.length != 0) {
      model.languages.forEach((lang, i) => {
        const node = `_:LANG${i}`;
        ttl += `  dcterms:requires ${node} ;\n`;
        additionalObjects += this.languageSkillToTurtle(lang, node);
      });
    }

    if (model.location) {
      ttl += `  dcterms:spatial "${this.escape(model.location)}" ;\n`;
    }

    if (model.motivationLetter) {
      ttl += `  dcterms:requires "motivation letter" ;\n`;
    }

    if (model.eqf) ttl += `  elm:EQFLevel "${this.escape(model.eqf)}" ;\n`;

    if (model.fields && model.fields.length != 0) {
      model.fields.forEach((field: Field) => {
        ttl += `  elm:ISCEDFCode "${this.escape(field.code)}" ;\n`;
      });
    }

    if (model.knowledge && model.knowledge.length != 0) {
      model.knowledge.forEach((subj: string) => {
        ttl += `  dcterms:subject geospacebok:${subj} ;\n`;
      });
    }

    if (model.skills.length != 0 || model.customSkills.length != 0) {
      model.skills
        .concat(model.customSkills)
        .forEach((skill: string, index: number) => {
          ttl += `  esco:relatedEssentialSkill _:SKILL${index};\n`;
          additionalObjects += `_:SKILL${index}\n`;
          additionalObjects += `  rdf:type esco:Skill ;\n`;
          additionalObjects += `  dcterms:title "${this.escape(skill)}" .\n\n`;
        });
    }

    if (model.competences.length != 0 || model.customCompetences.length != 0) {
      const customCompetences: string[] = model.customCompetences.map( value => value);
      model.competences.forEach((transversalSkill: Competence) => {
        if (transversalSkill.uri) {
          ttl += `  esco:relatedEssentialSkills <${transversalSkill.uri}> ;\n`;
        }
        else {
          customCompetences.push(transversalSkill.preferredLabel);
        }
      });
      customCompetences.forEach(
        (transversalSkill: string, index: number) => {
          ttl += `  esco:relatedEssentialSkill _:TRANSVERSAL${index} ;\n`;
          additionalObjects += `_:TRANSVERSAL${index}\n`;
          additionalObjects += `  rdf:type esco:Skill ;\n`;
          additionalObjects += `  dcterms:title "${this.escape(transversalSkill)}" .\n\n`;
        },
      );
    }

    if (model.dataRequired.length != 0) {
      model.dataRequired.forEach(value => {
        ttl += `  dcterms:requires <${value.url}> ;\n`;
      })
    }

    if (model.toolsRequired.length != 0) {
      model.toolsRequired.forEach(value => {
        ttl += `  dcterms:requires <${value.url}> ;\n`;
      })
    }

    ttl = ttl.trim().replace(/;$/, '.') + '\n\n';
    ttl += additionalObjects;

    return ttl;
  }

  private languageSkillToTurtle(lang: Language, node: string): string {
    return `${node}
  rdf:type geospacebok:LanguageSkill ;
  dcterms:language "${this.escape(lang.name)}" .

`;
  }

  /* ============================
     RDF/XML
     ============================ */

  private convertModelToRdfXml(model: JobOffer): string {
    const NS = {
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      dcterms: 'http://purl.org/dc/terms/',
      elm: 'http://data.europa.eu/snb/model/elm',
      esco: 'http://data.europa.eu/esco/model#',
      geospacebok: 'https://geospacebok.eu/',
    };

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF
    xmlns:rdf="${NS.rdf}"
    xmlns:rdfs="${NS.rdfs}"
    xmlns:dcterms="${NS.dcterms}"
    xmlns:elm="${NS.elm}"
    xmlns:esco="${NS.esco}"
    xmlns:geospacebok="${NS.geospacebok}"
>

  <rdf:Description rdf:about="${NS.geospacebok}JobOffer">
    <rdf:type rdf:resource="${NS.rdfs}Class"/>
  </rdf:Description>

  <rdf:Description rdf:about="${NS.geospacebok}ocuprofiles/${model._id}">
    <rdf:type rdf:resource="${NS.geospacebok}JobOffer"/>`;

    // Inherited + new JobOffer fields (matching Turtle order)
    if (model.title) xml += `\n    <dcterms:title>${this.escapeXml(model.title)}</dcterms:title>`;
    if (model.description) xml += `\n    <dcterms:description>${this.escapeXml(model.description)}</dcterms:description>`;
    if (model.additionalQuestions) xml += `\n    <rdfs:comment>${this.escapeXml(model.additionalQuestions)}</rdfs:comment>`;
    if (model.orgName) xml += `\n    <dcterms:publisher>${this.escapeXml(model.orgName + (model.division ? ' - ' + model.division : ''))}</dcterms:publisher>`;
    if (model.updatedAt) {
      const dt = model.updatedAt instanceof Date ? model.updatedAt.toISOString() : model.updatedAt.toDate().toISOString();
      xml += `\n    <dcterms:modified>${this.escapeXml(dt)}</dcterms:modified>`;
    }
    if (model.contactDetails) xml += `\n    <rdfs:seeAlso>${this.escapeXml(model.contactDetails)}</rdfs:seeAlso>`;
    if (model.salaryMin || model.salaryMax) {
      const salaryText = `Annual salary: ${model.salaryMin} - ${model.salaryMax}${model.currency ? ' ' + model.currency : ''}`;
      xml += `\n    <rdfs:comment>${this.escapeXml(salaryText)}</rdfs:comment>`;
    }
    if (model.yearsExperience) xml += `\n    <dcterms:requires>${this.escapeXml(model.yearsExperience + ' years of experience')}</dcterms:requires>`;
    if (model.dedication) xml += `\n    <dcterms:type>${this.escapeXml(model.dedication)}</dcterms:type>`;
    if (model.typeContract) xml += `\n    <dcterms:type>${this.escapeXml(model.typeContract)}</dcterms:type>`;
    if (model.location) xml += `\n    <dcterms:spatial>${this.escapeXml(model.location)}</dcterms:spatial>`;
    if (model.motivationLetter) xml += `\n    <dcterms:requires>motivation letter</dcterms:requires>`;

    // EQF, fields, knowledge (unchanged)
    if (model.eqf) xml += `\n    <elm:EQFLevel>${this.escapeXml(model.eqf)}</elm:EQFLevel>`;
    model.fields?.forEach((field) => {
      xml += `\n    <elm:ISCEDFCode>${this.escapeXml(field.code)}</elm:ISCEDFCode>`;
    });
    model.knowledge?.forEach((subj) => {
      xml += `\n    <dcterms:subject rdf:resource="${NS.geospacebok}${subj}"/>`;
    });

    // Skills & competences (unchanged bnode structure)
    model.skills.concat(model.customSkills).forEach((skill) => {
      xml += `\n    <esco:relatedEssentialSkill>
      <rdf:Description>
        <rdf:type rdf:resource="${NS.esco}Skill"/>
        <dcterms:title>${this.escapeXml(skill)}</dcterms:title>
      </rdf:Description>
    </esco:relatedEssentialSkill>`;
    });
    model.competences.forEach((comp) => {
      if (comp.uri) xml += `\n    <esco:relatedEssentialSkills rdf:resource="${comp.uri}"/>`;
    });
    model.customCompetences.forEach((label) => {
      xml += `\n    <esco:relatedEssentialSkill>
      <rdf:Description>
        <rdf:type rdf:resource="${NS.esco}Skill"/>
        <dcterms:title>${this.escapeXml(label)}</dcterms:title>
      </rdf:Description>
    </esco:relatedEssentialSkill>`;
    });

    // dataRequired, toolsRequired (URI links)
    model.dataRequired.forEach((ds) => {
      xml += `\n    <dcterms:requires rdf:resource="${ds.url}"/>`;
    });
    model.toolsRequired.forEach((tool) => {
      xml += `\n    <dcterms:requires rdf:resource="${tool.url}"/>`;
    });

    // Languages (using your helper pattern)
    model.languages.forEach((lang, i) => {
      xml += `\n    <dcterms:requires >
      <rdf:Description>
        <rdf:type rdf:resource="${NS.geospacebok}LanguageSkill"/>
        <dcterms:language>${this.escapeXml(lang.name)}</dcterms:language>
      </rdf:Description>
    </dcterms:requires>`;
    });

    xml += `\n  </rdf:Description>`;

    xml += `\n</rdf:RDF>`;
    return xml;
  }


  /* ============================
      RDFa 
      ============================ */

  private convertModelToRDFa(model: JobOffer): string {
    const NS = {
      dcterms: 'http://purl.org/dc/terms/',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      elm: 'http://data.europa.eu/snb/model/elm',
      esco: 'http://data.europa.eu/esco/model#',
      geospacebok: 'https://geospacebok.eu/',
    };

    const escape = (v: string) => this.escapeHtml(v);

    let html = `<div
    vocab="${NS.dcterms}"
    prefix="rdfs: ${NS.rdfs} elm: ${NS.elm} esco: ${NS.esco} geospacebok: ${NS.geospacebok}"
    about="https://geospacebok.eu/ocuprofiles/${model._id}"
    typeof="geospacebok:JobOffer"
  >`;

    // Title/description first
    if (model.title) html += `\n  <h1 property="title">${escape(model.title)}</h1>`;
    if (model.description) html += `\n  <p property="description">${escape(model.description)}</p>`;

    // New JobOffer fields as inline properties
    if (model.additionalQuestions) html += `\n  <p property="rdfs:comment">${escape(model.additionalQuestions)}</p>`;
    if (model.contactDetails) html += `\n  <a property="rdfs:seeAlso" href="${escape(model.contactDetails)}">Contact</a>`;
    if (model.salaryMin || model.salaryMax) {
      const salaryText = `Annual salary: ${model.salaryMin} - ${model.salaryMax}${model.currency ? ' ' + model.currency : ''}`;
      html += `\n  <span property="rdfs:comment">${escape(salaryText)}</span>`;
    }
    if (model.yearsExperience) html += `\n  <span property="requires">${escape(model.yearsExperience + ' years of experience')}</span>`;
    if (model.dedication) html += `\n  <span property="type">${escape(model.dedication)}</span>`;
    if (model.typeContract) html += `\n  <span property="type">${escape(model.typeContract)}</span>`;
    if (model.location) html += `\n  <span property="spatial">${escape(model.location)}</span>`;
    if (model.motivationLetter) html += `\n  <span property="requires">motivation letter</span>`;
    if (model.orgName) html += `\n  <span property="publisher">${escape(model.orgName + (model.division ? ' - ' + model.division : ''))}</span>`;

    // UpdatedAt as time
    if (model.updatedAt) {
      const dt = model.updatedAt instanceof Date ? model.updatedAt.toISOString() : model.updatedAt.toDate().toISOString();
      html += `\n  <time property="modified" datetime="${dt}">${dt}</time>`;
    }

    // EQF/fields/knowledge unchanged
    if (model.eqf) html += `\n  <span property="elm:EQFLevel">${escape(model.eqf)}</span>`;
    model.fields?.forEach((field) => {
      html += `\n  <span property="elm:ISCEDFCode">${escape(field.code)}</span>`;
    });
    model.knowledge?.forEach((subj) => {
      html += `\n  <a property="subject" href="https://geospacebok.eu/${subj}">Knowledge</a>`;
    });

  // Skills/competences unchanged nested divs
    model.skills.concat(model.customSkills).forEach((skill) => {
      html += `\n  <div property="esco:relatedEssentialSkill" typeof="esco:Skill">
    <span property="dcterms:title">${escape(skill)}</span>
  </div>`;
    });
    model.competences.forEach((comp) => {
      if (comp.uri) html += `\n  <a property="esco:relatedEssentialSkills" href="${comp.uri}">Competence</a>`;
    });
    model.customCompetences.forEach((label) => {
      html += `\n  <div property="esco:relatedEssentialSkill" typeof="esco:Skill">
    <span property="dcterms:title">${escape(label)}</span>
  </div>`;
    });

    // dataRequired/toolsRequired as links
    model.dataRequired.forEach((ds) => {
      html += `\n  <a property="requires" href="${ds.url}">Dataset</a>`;
    });
    model.toolsRequired.forEach((tool) => {
      html += `\n  <a property="requires" href="${tool.url}">Tool</a>`;
    });

    // Languages with nested bnode-like structure
    model.languages.forEach((lang) => {
      html += `\n  <div property="requires" typeof="geospacebok:LanguageSkill">
    <span property="dcterms:language">${escape(lang.name)}</span>
  </div>`;
    });

    html += `\n</div>`;
    return html;
  }


  /* ============================
     Escaping helpers
     ============================ */

  private escape(str: string): string {
    const inlineString: string = str
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join(' ');
    return inlineString.replace(
      /[<>&'"]/g,
      (c) =>
        ({
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          "'": '&apos;',
          '"': '&quot;',
        })[c]!,
    );
  }

  private escapeXml(str: string): string {
    return this.escape(str);
  }

  private escapeHtml(str: string): string {
    return str.replace(
      /[<>&]/g,
      (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!,
    );
  }
}
