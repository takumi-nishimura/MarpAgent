const severities = ["info", "low", "moderate", "high", "critical"];

function compatibleFix(value) {
    return value === true || (value && value.isSemVerMajor === false);
}

function compareAudit(report, baseline) {
    if (
        !report ||
        report.error ||
        !report.vulnerabilities ||
        typeof report.vulnerabilities !== "object" ||
        Array.isArray(report.vulnerabilities)
    ) {
        throw new Error(
            "Invalid npm audit report; the registry check did not complete.",
        );
    }
    const regressions = [];
    for (const [name, current] of Object.entries(report.vulnerabilities)) {
        if (
            !current ||
            !severities.includes(current.severity) ||
            !Array.isArray(current.via) ||
            !Array.isArray(current.nodes) ||
            !current.nodes.every((node) => typeof node === "string") ||
            !current.via.every(
                (entry) =>
                    typeof entry === "string" ||
                    (entry && typeof entry.url === "string"),
            )
        ) {
            throw new Error(`Invalid npm audit report for ${name}.`);
        }
        const accepted = baseline.accepted[name];
        if (!accepted) {
            regressions.push(
                `${name}: new vulnerable package (${current.severity}).`,
            );
            continue;
        }
        if (
            severities.indexOf(current.severity) >
            severities.indexOf(accepted.severity)
        ) {
            regressions.push(
                `${name}: severity increased from ${accepted.severity} to ${current.severity}.`,
            );
        }
        for (const advisory of current.via.filter(
            (entry) => typeof entry === "object",
        )) {
            if (!accepted.advisories.includes(advisory.url)) {
                regressions.push(`${name}: new advisory ${advisory.url}.`);
            }
        }
        for (const node of current.nodes) {
            if (!accepted.nodes.includes(node))
                regressions.push(`${name}: new affected path ${node}.`);
        }
        if (
            compatibleFix(current.fixAvailable) &&
            !compatibleFix(accepted.fixAvailable)
        ) {
            regressions.push(
                `${name}: a compatible fix is now available; reassess ISS-0042.`,
            );
        }
    }
    return {
        regressions,
        resolved: Object.keys(baseline.accepted).filter(
            (name) => !report.vulnerabilities[name],
        ),
    };
}

module.exports = { compareAudit };
