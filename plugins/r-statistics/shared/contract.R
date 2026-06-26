# r-statistics — R execution contract
#
# Sourced by every run-r execution (the generated wrapper does:
#   source(Sys.getenv("R_STATISTICS_CONTRACT")); .rstat_init(); <user code>; .rstat_finalize()
# ). Defines the artifact helpers and the init/finalize lifecycle so method
# templates never hand-roll output paths, manifests, or seeding. All paths and
# the seed arrive via environment variables set by the MCP server.
#
# Manifest schema written to ARTIFACTS_DIR/manifest.json (consumed by the MCP):
#   { "seed": <int>, "artifacts": [{ "id", "kind", "file", "description"? }],
#     "consumedAssumptions": [<id>...], "sessionInfo": "<text>" }

.rstat_env <- new.env(parent = emptyenv())

# ---- lifecycle ------------------------------------------------------------

.rstat_init <- function() {
  .rstat_env$artifacts_dir <- Sys.getenv("R_STATISTICS_ARTIFACTS_DIR")
  .rstat_env$data_dir <- Sys.getenv("R_STATISTICS_DATA_DIR")
  seed <- suppressWarnings(as.integer(Sys.getenv("R_STATISTICS_SEED", "20260101")))
  if (!is.na(seed)) set.seed(seed)
  .rstat_env$seed <- seed
  .rstat_env$artifacts <- list()
  .rstat_env$consumed <- character(0)

  refs_path <- file.path(.rstat_env$data_dir, "refs.json")
  .rstat_env$refs <- list()
  if (nzchar(.rstat_env$data_dir) && file.exists(refs_path)) {
    if (!requireNamespace("jsonlite", quietly = TRUE)) {
      stop(
        "r-statistics contract: data inputs were provided (data/refs.json is ",
        "present) but the 'jsonlite' package is not installed, so data ",
        "references cannot be resolved. Install the R package set via the ",
        "r-setup skill, then re-run.",
        call. = FALSE
      )
    }
    .rstat_env$refs <- jsonlite::fromJSON(refs_path, simplifyVector = FALSE)
  }
  invisible(NULL)
}

.rstat_finalize <- function() {
  # Skip the manifest when there is no artifacts dir, or when the JSON writer is
  # unavailable — the run still succeeded and files are collected by directory
  # scan; only the manifest metadata is omitted.
  if (!nzchar(.rstat_env$artifacts_dir) ||
    !requireNamespace("jsonlite", quietly = TRUE)) {
    return(invisible(NULL))
  }
  session_info <- paste(utils::capture.output(print(utils::sessionInfo())),
    collapse = "\n"
  )
  manifest <- list(
    seed = .rstat_env$seed,
    artifacts = .rstat_env$artifacts,
    consumedAssumptions = as.list(.rstat_env$consumed),
    sessionInfo = session_info
  )
  jsonlite::write_json(
    manifest,
    file.path(.rstat_env$artifacts_dir, "manifest.json"),
    auto_unbox = TRUE, pretty = TRUE, null = "null"
  )
  invisible(NULL)
}

# ---- input data -----------------------------------------------------------

# Resolve a declared data ref by id, distinguishing "no inputs declared" from
# "id not among the declared inputs" so the message names the real cause.
.rstat_ref <- function(id) {
  ref <- .rstat_env$refs[[id]]
  if (!is.null(ref)) return(ref)
  if (length(.rstat_env$refs) == 0L) {
    stop(sprintf(
      "Data ref '%s' was requested but no inputs were declared for this run.",
      id
    ), call. = FALSE)
  }
  stop(sprintf(
    "Unknown data ref '%s'. Declared refs: %s.",
    id, paste(names(.rstat_env$refs), collapse = ", ")
  ), call. = FALSE)
}

# Absolute path to a declared input dataset by its ref id.
data_path <- function(id) {
  ref <- .rstat_ref(id)
  file.path(.rstat_env$data_dir, ref$file)
}

# Read a declared input dataset, dispatching on its declared format.
read_data <- function(id) {
  ref <- .rstat_ref(id)
  path <- file.path(.rstat_env$data_dir, ref$file)
  switch(ref$format,
    csv = {
      enc <- ref$encoding
      if (is.null(enc) || !nzchar(enc)) enc <- ""
      utils::read.csv(
        path,
        check.names = FALSE,
        stringsAsFactors = FALSE,
        fileEncoding = enc
      )
    },
    parquet = as.data.frame(arrow::read_parquet(path)),
    feather = as.data.frame(arrow::read_feather(path)),
    rds = readRDS(path),
    json = jsonlite::fromJSON(path),
    stop(sprintf("Unsupported data format: %s", ref$format))
  )
}

# ---- artifact output ------------------------------------------------------

# Absolute path inside ARTIFACTS_DIR for an output file name.
artifact_path <- function(file) {
  file.path(.rstat_env$artifacts_dir, basename(file))
}

# Register an output file in the manifest (file is recorded as its base name).
add_artifact <- function(id, kind, file, description = NULL) {
  entry <- list(id = id, kind = kind, file = basename(file))
  if (!is.null(description)) entry$description <- description
  .rstat_env$artifacts[[length(.rstat_env$artifacts) + 1L]] <- entry
  invisible(file)
}

# Write an R object as a JSON artifact and register it.
write_json_artifact <- function(id, kind, obj, file, description = NULL) {
  path <- artifact_path(file)
  jsonlite::write_json(obj, path, auto_unbox = TRUE, pretty = TRUE, na = "null")
  add_artifact(id, kind, file, description)
}

# Save a ggplot (or last plot) as an image artifact and register it.
save_plot_artifact <- function(id, plot, file, description = NULL,
                               width = 7, height = 5, dpi = 150) {
  path <- artifact_path(file)
  ggplot2::ggsave(filename = path, plot = plot, width = width, height = height, dpi = dpi)
  add_artifact(id, "plot", file, description)
}

# Record that an assumption was checked/consumed (surfaced in the manifest).
note_assumption <- function(id) {
  .rstat_env$consumed <- unique(c(.rstat_env$consumed, id))
  invisible(id)
}
