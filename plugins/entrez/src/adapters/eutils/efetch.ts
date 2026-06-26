import { EutilFn, RetMode, ErrorCode, type Db } from "../../types/enums.js";
import type { HttpDeps } from "../../types/http.js";
import type { PaperRecord, Author } from "../../types/record.js";
import { buildBaseUrl } from "../../core/sourceResolver/index.js";
import { httpRequest } from "../../core/httpClient/index.js";
import { parseXml, asArray, textOf, collectText } from "../../lib/xmlParse.js";

export interface EfetchArgs {
  db: Db;
  ids: string[];
  webEnv?: string;
  queryKey?: string;
  retstart?: number;
  retmax?: number;
  baseUrl?: string;
}

const ORCID_SOURCE = "ORCID";
type Node = Record<string, unknown>;

function parseAuthor(raw: Node): Author {
  const identifiers = asArray<Node>(raw.Identifier as Node | Node[] | undefined);
  const orcidNode = identifiers.find((id) => id["@_Source"] === ORCID_SOURCE);
  return {
    lastName: textOf(raw.LastName),
    foreName: textOf(raw.ForeName),
    initials: textOf(raw.Initials),
    collective: textOf(raw.CollectiveName),
    orcid: orcidNode ? textOf(orcidNode) : undefined,
  };
}

function parseAbstract(articleNode: Node): string | undefined {
  const abstract = articleNode.Abstract as Node | undefined;
  if (!abstract) return undefined;
  const sections = asArray<unknown>(abstract.AbstractText as unknown);
  const parts = sections
    .map((section) => {
      const label =
        section && typeof section === "object"
          ? (section as Node)["@_Label"]
          : undefined;
      const text = collectText(section).trim();
      return label ? `${String(label)}: ${text}` : text;
    })
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts.join("\n") : undefined;
}

function parseYear(articleNode: Node): number | undefined {
  const journal = articleNode.Journal as Node | undefined;
  const pubDate = (journal?.JournalIssue as Node | undefined)?.PubDate as
    | Node
    | undefined;
  const year = textOf(pubDate?.Year);
  if (year) return Number(year);
  const medlineDate = textOf(pubDate?.MedlineDate);
  const match = medlineDate?.match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
}

function parseArticleIds(pubmedData: Node | undefined): {
  doi?: string;
  pmcid?: string;
} {
  const list = (pubmedData?.ArticleIdList as Node | undefined)?.ArticleId;
  const ids = asArray<Node>(list as Node | Node[] | undefined);
  const doi = ids.find((id) => id["@_IdType"] === "doi");
  const pmc = ids.find((id) => id["@_IdType"] === "pmc");
  return { doi: textOf(doi), pmcid: textOf(pmc) };
}

function parseMesh(citation: Node): string[] {
  const list = (citation.MeshHeadingList as Node | undefined)?.MeshHeading;
  const headings = asArray<Node>(list as Node | Node[] | undefined);
  return headings
    .map((h) => textOf((h as Node).DescriptorName))
    .filter((d): d is string => Boolean(d));
}

function parseArticle(article: Node): PaperRecord | null {
  const citation = article.MedlineCitation as Node | undefined;
  if (!citation) return null;
  const articleNode = citation.Article as Node | undefined;
  const pmid = textOf(citation.PMID);
  if (!pmid || !articleNode) return null;

  const authors = asArray<Node>(
    (articleNode.AuthorList as Node | undefined)?.Author as Node | Node[] | undefined,
  ).map(parseAuthor);

  const { doi, pmcid } = parseArticleIds(article.PubmedData as Node | undefined);

  return {
    pmid,
    doi,
    pmcid,
    title: collectText(articleNode.ArticleTitle).trim() || pmid,
    abstract: parseAbstract(articleNode),
    authors,
    journal: textOf((articleNode.Journal as Node | undefined)?.Title),
    year: parseYear(articleNode),
    mesh: parseMesh(citation),
    hit_by: [],
    query_role: [],
  };
}

/** Parse an EFetch PubmedArticleSet into structured PaperRecords. */
export function parseEfetch(xml: string): PaperRecord[] {
  const doc = parseXml(xml) as { PubmedArticleSet?: Node } | null;
  const set = doc?.PubmedArticleSet;
  if (!set) return [];
  return asArray<Node>(set.PubmedArticle as Node | Node[] | undefined)
    .map(parseArticle)
    .filter((r): r is PaperRecord => r !== null);
}

/** EFetch — full structured records (authors, MeSH, abstract, doi, pmcid). */
export async function efetch(
  args: EfetchArgs,
  deps: HttpDeps,
): Promise<PaperRecord[]> {
  const url = buildBaseUrl(EutilFn.EFETCH, args.baseUrl);
  const res = await httpRequest(
    {
      url,
      params: {
        db: args.db,
        id: args.ids.length > 0 ? args.ids.join(",") : undefined,
        WebEnv: args.webEnv,
        query_key: args.queryKey,
        retstart: args.retstart,
        retmax: args.retmax,
        retmode: RetMode.XML,
      },
    },
    deps,
  );
  if (!res.ok || res.text === undefined) {
    throw new Error(res.error?.message ?? `${ErrorCode.EUTILS_ERROR}: efetch`);
  }
  return parseEfetch(res.text);
}
