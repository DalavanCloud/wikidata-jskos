const { sparqlRows, selectedLanguages, labelFromSparql, promiseRequest }
  = require("./utils.js")

/**
 * load schemes via SPARQL.
 */
function getMappingSchemes(query) {
  query = query || {}
  const languages = selectedLanguages(query)

  // TODO: only include if needed

  const subqueries = []

  subqueries.push(`OPTIONAL {
    SELECT ?property (SAMPLE(?number) AS ?extent) {
      ?property wdt:P4876|wdt:P1114 ?number
    } GROUP BY ?property
  }`)

  subqueries.push(`OPTIONAL {
    SELECT ?scheme (GROUP_CONCAT(?name) AS ?shortName) WHERE {
      ?scheme wdt:P1813 ?name
    } GROUP BY ?scheme
  }`)

  subqueries.push(`OPTIONAL {
    SELECT ?scheme (GROUP_CONCAT(?uri) AS ?identifier) WHERE {
      ?scheme wdt:P2888|wdt:P1709 ?uri .
    } GROUP BY ?scheme
  }`)

  const sparql = `
    SELECT DISTINCT
      ?property ?scheme ?schemeLabel ?shortName
      ?bartoc ?PREFIX ?PATTERN ?identifier ?extent
    WITH {
      SELECT ?property ?scheme ?bartoc ?PREFIX ?PATTERN {
        ?property wdt:P1921 ?PREFIX .
        ?property wdt:P1793 ?PATTERN .
        { { ?property wdt:P1629 ?scheme } UNION { ?scheme wdt:P1687 ?property } }
        ?scheme wdtn:P2689 ?bartoc .
      }
    } AS %properties WHERE {
      INCLUDE %properties .
      ${subqueries.join("\n")}
      SERVICE wikibase:label {
        bd:serviceParam wikibase:language "${languages.join(",")}".
      }
    }`

  return sparqlRows(sparql, promiseRequest)
    .then(rows => {
      return rows.map(row => {
        const identifier = row.identifier ? row.identifier.value.split(" ") : []
        const scheme = {
          uri: row.bartoc.value,
          identifier: [row.scheme.value].concat(identifier),
          PROPERTY: row.property.value.split("/").pop(),
          PATTERN: row.PATTERN.value,
          PREFIX: row.PREFIX.value,
        }
        if (row.extent) {
          scheme.extent = row.extent.value
        }
        if (row.shortName) {
          scheme.notation = row.shortName.value.split(" ")
        }
        if (row.schemeLabel) {
          scheme.prefLabel = labelFromSparql(row.schemeLabel)
        }
        return scheme
      })
    })
}

module.exports = { getMappingSchemes }

