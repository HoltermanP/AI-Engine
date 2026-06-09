import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  real,
  integer,
  customType,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

const geometry = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geometry';
  },
});

export const organisatie = pgTable('organisatie', {
  id: uuid('id').primaryKey().defaultRandom(),
  legacyId: text('legacy_id').unique(),
  naam: text('naam').notNull(),
  clerkOrgId: text('clerk_org_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const gebruiker = pgTable('gebruiker', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  organisatieId: uuid('organisatie_id').references(() => organisatie.id),
  naam: text('naam').notNull(),
  email: text('email').notNull(),
  rol: text('rol').notNull().default('gebruiker'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const project = pgTable('project', {
  id: uuid('id').primaryKey().defaultRandom(),
  legacyId: text('legacy_id').unique(),
  organisatieId: uuid('organisatie_id')
    .references(() => organisatie.id)
    .notNull(),
  naam: text('naam').notNull(),
  omschrijving: text('omschrijving'),
  status: text('status').notNull().default('actief'),
  gebied: text('gebied'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const trace = pgTable('trace', {
  id: uuid('id').primaryKey().defaultRandom(),
  legacyId: text('legacy_id').unique(),
  projectId: uuid('project_id').references(() => project.id).notNull(),
  code: text('code').notNull(),
  naam: text('naam').notNull(),
  discipline: text('discipline').notNull(),
  netType: text('net_type'),
  fase: text('fase').notNull().default('VO'),
  vereisteDekking: real('vereiste_dekking').notNull().default(0.6),
  geom: geometry('geom'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const traceSegment = pgTable('trace_segment', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: uuid('trace_id').references(() => trace.id).notNull(),
  volgorde: integer('volgorde').notNull(),
  legtechniek: text('legtechniek').notNull(),
  lengteM: real('lengte_m'),
  geom: geometry('geom'),
});

export const databron = pgTable('databron', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: uuid('trace_id').references(() => trace.id),
  bron: text('bron').notNull(),
  leverancier: text('leverancier'),
  versie: text('versie'),
  opgehaaldOp: timestamp('opgehaald_op').defaultNow(),
  kwaliteit: text('kwaliteit'),
  source: text('_source').notNull().default('demo'),
});

export const bestaandNet = pgTable('bestaand_net', {
  id: uuid('id').primaryKey().defaultRandom(),
  legacyId: text('legacy_id').unique(),
  traceId: uuid('trace_id').references(() => trace.id),
  thema: text('thema').notNull(),
  beheerder: text('beheerder').notNull(),
  spanningOfDiameter: text('spanning_of_diameter'),
  materiaal: text('materiaal'),
  nauwkeurigheid: text('nauwkeurigheid').notNull(),
  diepte: real('diepte'),
  vrijTeHoudenAfstand: real('vrij_te_houden_afstand'),
  geom: geometry('geom'),
  source: text('_source').notNull().default('demo'),
});

export const maaiveld = pgTable('maaiveld', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: uuid('trace_id').references(() => trace.id).notNull(),
  chainage: real('chainage').notNull(),
  hoogteNap: real('hoogte_nap').notNull(),
  geom: geometry('geom'),
  source: text('_source').notNull().default('demo'),
});

export const sondering = pgTable('sondering', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: uuid('trace_id').references(() => trace.id),
  qc: real('qc'),
  grondsoort: text('grondsoort'),
  diepte: real('diepte'),
  geom: geometry('geom'),
  source: text('_source').notNull().default('demo'),
});

export const bodemlaag = pgTable('bodemlaag', {
  id: uuid('id').primaryKey().defaultRandom(),
  sonderingId: uuid('sondering_id').references(() => sondering.id).notNull(),
  vanM: real('van_m').notNull(),
  totM: real('tot_m').notNull(),
  grondsoort: text('grondsoort').notNull(),
  qc: real('qc'),
});

export const grondwater = pgTable('grondwater', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: uuid('trace_id').references(() => trace.id),
  standNap: real('stand_nap').notNull(),
  meetdatum: text('meetdatum'),
  geom: geometry('geom'),
  source: text('_source').notNull().default('demo'),
});

export const perceel = pgTable('perceel', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: uuid('trace_id').references(() => trace.id),
  perceelnummer: text('perceelnummer').notNull(),
  oppervlakte: real('oppervlakte'),
  geom: geometry('geom'),
  source: text('_source').notNull().default('demo'),
});

export const eigenaarType = pgTable('eigenaar_type', {
  id: uuid('id').primaryKey().defaultRandom(),
  perceelId: uuid('perceel_id').references(() => perceel.id).notNull(),
  type: text('type').notNull(),
  zakelijkRecht: text('zakelijk_recht'),
});

export const belemmering = pgTable('belemmering', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: uuid('trace_id').references(() => trace.id),
  categorie: text('categorie').notNull(),
  beheerder: text('beheerder'),
  kruisingRegime: text('kruising_regime'),
  eisDekking: real('eis_dekking'),
  geom: geometry('geom'),
  source: text('_source').notNull().default('demo'),
});

export const kruising = pgTable('kruising', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: uuid('trace_id').references(() => trace.id).notNull(),
  objectType: text('object_type').notNull(),
  objectId: text('object_id'),
  regime: text('regime'),
  geom: geometry('geom'),
});

export const conflict = pgTable('conflict', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: uuid('trace_id').references(() => trace.id).notNull(),
  type: text('type').notNull(),
  ernst: text('ernst').notNull(),
  norm: text('norm'),
  waardeGemeten: real('waarde_gemeten'),
  waardeEis: real('waarde_eis'),
  toelichting: text('toelichting'),
  geom: geometry('geom'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const berekening = pgTable('berekening', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: uuid('trace_id').references(() => trace.id).notNull(),
  discipline: text('discipline').notNull(),
  type: text('type').notNull(),
  invoer: jsonb('invoer'),
  resultaat: jsonb('resultaat'),
  normReferentie: text('norm_referentie'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tekening = pgTable('tekening', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: uuid('trace_id').references(() => trace.id).notNull(),
  type: text('type').notNull(),
  blobUrl: text('blob_url'),
  formaat: text('formaat').default('svg'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const onderzoek = pgTable('onderzoek', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: uuid('trace_id').references(() => trace.id).notNull(),
  type: text('type').notNull(),
  discipline: text('discipline'),
  status: text('status').notNull().default('open'),
  rapportBlob: text('rapport_blob'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aanvraag = pgTable('aanvraag', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: uuid('trace_id').references(() => trace.id).notNull(),
  type: text('type').notNull(),
  ontvanger: text('ontvanger'),
  status: text('status').notNull().default('concept'),
  documentBlob: text('document_blob'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const document = pgTable('document', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => project.id).notNull(),
  traceId: uuid('trace_id').references(() => trace.id),
  naam: text('naam').notNull(),
  type: text('type').notNull(),
  blobUrl: text('blob_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projectRelations = relations(project, ({ many, one }) => ({
  organisatie: one(organisatie, {
    fields: [project.organisatieId],
    references: [organisatie.id],
  }),
  traces: many(trace),
}));

export const traceRelations = relations(trace, ({ one, many }) => ({
  project: one(project, {
    fields: [trace.projectId],
    references: [project.id],
  }),
  segmenten: many(traceSegment),
  conflicten: many(conflict),
}));
