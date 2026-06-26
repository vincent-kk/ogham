/** Recorded-shape NCBI E-utility responses for deterministic parser tests. */

export const ESEARCH_JSON = JSON.stringify({
  header: { type: "esearch" },
  esearchresult: {
    count: "1234",
    retmax: "0",
    retstart: "0",
    idlist: ["1", "2", "3"],
    translationset: [],
    querytranslation: '"neoplasms"[MeSH Terms]',
    webenv: "MCID_abc",
    querykey: "1",
    warninglist: {
      phrasesignored: [],
      quotedphrasesnotfound: [],
      outputmessages: ["No items found."],
      phrasesnotfound: ["xyzzy"],
    },
  },
});

export const EFETCH_XML = `<?xml version="1.0" ?>
<PubmedArticleSet>
<PubmedArticle>
<MedlineCitation Status="MEDLINE">
<PMID Version="1">12345678</PMID>
<Article PubModel="Print">
<Journal><Title>Journal of Testing</Title><JournalIssue><PubDate><Year>2021</Year></PubDate></JournalIssue></Journal>
<ArticleTitle>Effects of <i>BRCA1</i> on cancer</ArticleTitle>
<Abstract>
<AbstractText Label="BACKGROUND">We studied <sub>x</sub> things.</AbstractText>
<AbstractText Label="RESULTS">It worked.</AbstractText>
</Abstract>
<AuthorList>
<Author><LastName>Doe</LastName><ForeName>Jane</ForeName><Initials>J</Initials><Identifier Source="ORCID">0000-0002-1825-0097</Identifier></Author>
<Author><CollectiveName>The Study Consortium</CollectiveName></Author>
</AuthorList>
</Article>
<MeshHeadingList>
<MeshHeading><DescriptorName UI="D001943">Breast Neoplasms</DescriptorName></MeshHeading>
<MeshHeading><DescriptorName UI="D000086382">Genes, BRCA1</DescriptorName></MeshHeading>
</MeshHeadingList>
</MedlineCitation>
<PubmedData><ArticleIdList>
<ArticleId IdType="pubmed">12345678</ArticleId>
<ArticleId IdType="doi">10.1000/test</ArticleId>
<ArticleId IdType="pmc">PMC7654321</ArticleId>
</ArticleIdList></PubmedData>
</PubmedArticle>
<PubmedArticle>
<MedlineCitation>
<PMID Version="1">222</PMID>
<Article>
<Journal><Title>J Two</Title><JournalIssue><PubDate><MedlineDate>2019 Nov-Dec</MedlineDate></PubDate></JournalIssue></Journal>
<ArticleTitle>Minimal article</ArticleTitle>
</Article>
</MedlineCitation>
</PubmedArticle>
</PubmedArticleSet>`;

export const ESUMMARY_JSON = JSON.stringify({
  result: {
    uids: ["111"],
    "111": {
      uid: "111",
      title: "Sum title",
      fulljournalname: "Nature",
      pubdate: "2020 Jan 15",
      authors: [{ name: "Smith J" }, { name: "Lee K" }],
      articleids: [
        { idtype: "doi", value: "10.1/x" },
        { idtype: "pmc", value: "PMC9" },
      ],
    },
  },
});

export const ESPELL_XML = `<?xml version="1.0"?>
<eSpellResult><Database>pubmed</Database><Query>astma</Query><CorrectedQuery>asthma</CorrectedQuery><ERROR/></eSpellResult>`;

export const ESPELL_XML_NO_CORRECTION = `<?xml version="1.0"?>
<eSpellResult><Database>pubmed</Database><Query>asthma</Query><CorrectedQuery/><ERROR/></eSpellResult>`;

export const ELINK_JSON = JSON.stringify({
  linksets: [
    {
      dbfrom: "pubmed",
      ids: ["111"],
      linksetdbs: [
        { dbto: "pubmed", linkname: "pubmed_pubmed", links: ["111", "222", "333"] },
      ],
    },
  ],
});

export const IDCONV_JSON = JSON.stringify({
  status: "ok",
  records: [
    { pmcid: "PMC1", pmid: "11", doi: "10.1/a" },
    { pmid: "99", status: "error", errmsg: "invalid article id" },
  ],
});

export const OA_XML = `<?xml version="1.0"?>
<OA><responseDate>2024</responseDate><request id="PMC13900"/>
<records returned-count="1" total-count="1">
<record id="PMC13900" citation="..." license="CC BY">
<link format="tgz" href="ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa.tar.gz"/>
<link format="pdf" href="ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/x.pdf"/>
</record></records></OA>`;

export const OA_XML_NOT_OA = `<?xml version="1.0"?>
<OA><responseDate>2024</responseDate><request id="PMC1"/>
<error code="idIsNotOpenAccess">identifier 'PMC1' is not Open Access</error></OA>`;
