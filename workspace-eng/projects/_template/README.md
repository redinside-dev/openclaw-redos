# Project Template

This is the standardized template for all 10 projects. Each project will follow this structure:

## Structure
- `README.md` - Project overview and setup instructions
- `SPEC.md` - Detailed specifications and requirements
- `PM-LOG.md` - Project management log and progress tracking
- `scripts/create-project-repo.sh` - Automated GitHub repository creation

## Usage

To create a new project from this template:

1. Copy this directory to `projects/<project-name>/`
2. Run `scripts/create-project-repo.sh` to create the GitHub repository
3. Update SPEC.md with project-specific requirements
4. Begin development

## Automation

The `create-project-repo.sh` script handles:
- GitHub repository creation with `--public --clone` flags
- Initial commit and push
- Basic project structure setup