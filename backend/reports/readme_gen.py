from agents.prompts import README_PROMPT


async def generate_readme(
    llm,
    repo_url: str,
    arch_report: dict,
    security_report: dict,
    quality_report: dict,
) -> dict:
    """Use the LLM to generate a polished README based on the analysis reports."""

    context = f"""
Repository: {repo_url}

=== ARCHITECTURE ===
Languages: {arch_report.get('languages', {})}
Frameworks: {arch_report.get('frameworks', [])}
Patterns: {arch_report.get('patterns', [])}
Entry Points: {arch_report.get('entry_points', [])}
Stats: {arch_report.get('stats', {})}

Folder Structure:
{arch_report.get('folder_tree', '')[:3000]}

=== SECURITY ===
Risk Level: {security_report.get('risk_level', 'N/A')}
Total Findings: {security_report.get('total_findings', 0)}
Severity Counts: {security_report.get('severity_counts', {})}

=== CODE QUALITY ===
Quality Grade: {quality_report.get('summary', {}).get('quality_grade', 'N/A')}
Quality Score: {quality_report.get('summary', {}).get('quality_score', 'N/A')}/100
Total Files: {quality_report.get('summary', {}).get('total_files', 0)}
Total Lines: {quality_report.get('summary', {}).get('total_lines', 0)}
Test Coverage Ratio: {quality_report.get('summary', {}).get('test_coverage_ratio', 0):.1%}
TODOs: {quality_report.get('summary', {}).get('total_todos', 0)}
""".strip()

    from langchain_core.messages import HumanMessage, SystemMessage

    messages = [
        SystemMessage(content=README_PROMPT),
        HumanMessage(content=context),
    ]

    response = await llm.ainvoke(messages)
    readme_content = response.content

    return {
        "content": readme_content,
        "word_count": len(readme_content.split()),
    }
