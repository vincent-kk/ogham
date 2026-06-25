# r-statistics — R execution contract
#
# Sourced by every run_r execution (the generated wrapper does:
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
  if (nzchar(.rstat_env$data_dir) && file.exists(refs_path) &&
    requireNamespace("jsonlite", quietly = TRUE)) {
    .rstat_env$refs <- jsonlite::fromJSON(refs_path, simplifyVector = FALSE)
  } else {
    .rstat_env$refs <- list()
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

# Absolute path to a declared input dataset by its ref id.
data_path <- function(id) {
  ref <- .rstat_env$refs[[id]]
  if (is.null(ref)) stop(sprintf("Unknown data ref: %s", id))
  file.path(.rstat_env$data_dir, ref$file)
}

# Read a declared input dataset, dispatching on its declared format.
read_data <- function(id) {
  ref <- .rstat_env$refs[[id]]
  if (is.null(ref)) stop(sprintf("Unknown data ref: %s", id))
  path <- file.path(.rstat_env$data_dir, ref$file)
  switch(ref$format,
    csv = data.table::fread(path),
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
