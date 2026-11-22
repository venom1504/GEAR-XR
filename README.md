# GEAR-XR

Interactive Three.js/WebXR brain, gene-expression and protein demonstration.

This repository contains the prebuilt public website and its scientific attribution.

## NeuroAtlas XR Demo

![NeuroAtlas XR 3D Brain Rotation](docs/images/brain-rotation-loop.gif)

**An interactive 3D brain visualization platform for exploring developmental gene expression associated with autism research.**

NeuroAtlas XR is an interdisciplinary undergraduate research project at the University of California, Santa Cruz. We are exploring how computational biology, neuroscience, scientific visualization, and extended reality (XR) can be combined to make developmental brain gene-expression data more accessible and interactive.

## Project Overview

Our goal is to develop an interactive 3D brain atlas that allows users to explore gene-expression measurements across anatomical brain regions and developmental stages.

The project also aims to establish a foundation for original undergraduate research in computational biology and scientific visualization.

## Current Development

We have developed an early browser-based 3D brain prototype using Three.js.

Current and planned development areas include:

- Interactive 3D brain visualization
- Anatomical brain-region selection
- Autism-associated gene exploration
- Developmental-stage selection
- Integration of verified gene-expression datasets
- Quantitative expression visualization
- WebXR and immersive scientific exploration

**Research integrity:** Some early prototype visualizations use demonstration or simulated values. These are not validated biological measurements. We are working toward integrating verified scientific datasets.

## Research Direction

We are investigating how developmental gene-expression data for autism-associated genes can be integrated into anatomically accurate brain visualizations.

Potential research directions include:

- Computational analysis of developmental gene-expression patterns
- Scientific visualization methods for neurogenomic datasets
- Interactive exploration of brain anatomy and gene expression
- Evaluation of 3D and immersive visualization approaches

Our research questions and methodology are still being developed.

## Technologies

- JavaScript
- Three.js
- WebXR
- Python
- Blender
- Git and GitHub

## Scientific Data Sources

We are investigating the following scientific resources:

- [BrainSpan](https://www.brainspan.org/) – Developing human brain transcriptomic data.
- [SFARI Gene](https://gene.sfari.org/) – Autism-associated gene information and supporting evidence.
- [Allen Brain Atlas](https://portal.brain-map.org/) – Brain anatomy and gene-expression resources.
- [Human Protein Atlas](https://www.proteinatlas.org/) – Complementary gene and protein information.
- [NCBI GEO](https://www.ncbi.nlm.nih.gov/geo/) – Public functional genomics datasets.

Dataset integration, validation, and licensing are ongoing.

## Running Locally

The development environment and installation instructions will be documented as the project architecture is finalized.

## Screenshots and Demonstrations

_Add screenshots and recordings of the actual working prototype here._

## Open Source and Licensing

We aim to make the software development process open and accessible to the research community.

Software, scientific datasets, anatomical models, and other third-party assets may have separate licensing and usage requirements. Their respective licenses and attribution requirements will be documented before redistribution.

## Project Status

NeuroAtlas XR is currently in early prototype development, with ongoing scientific data investigation, technical development, and research planning.

## Acknowledgments

We appreciate the technical guidance and feedback of researchers who have helped us evaluate the project's scientific visualization and XR direction.

Further acknowledgments and contributor information will be added as collaborations are established.

---

**University of California, Santa Cruz | Undergraduate Research Initiative**

## Public Allen mouse RNA demo

The Allen CCF mouse atlas includes anatomical region labels, annotated slices and a six-gene adult mouse RNA ISH demo (Ctf1, Tbr1, Slc17a7, Gad1, Pvalb and Sst). Select a gene and experiment, then select a region to inspect the source measurements. Optional regional RNA coloring and adjustable mouse-brain opacity are available. Earlier Allen expression summaries are matched by exact structure ID to the 2020 labels, not overlaid as a registered voxel map. The human atlas and its HPA evidence remain unchanged. See `MOUSE_EXPRESSION.md`.
