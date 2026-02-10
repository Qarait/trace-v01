/**
 * Canned Scenario Data for v0.1 Demo
 */

export const DEMO_SCENARIO = {
    question: "How long is the warranty for the X-15 battery?",
    assumptions: [
        "User is asking about the personal use warranty, not commercial."
    ],
    retrieval: [
        {
            url: "https://example.com/manuals/x15-specs.pdf",
            text: "The X-15 high-performance battery includes a 36-month warranty for personal use. Commercial use is limited to 12 months. Any modification voids the agreement.",
        }
    ],
    hypotheses: [
        {
            text: "The X-15 battery has a 36-month warranty for personal use.",
            supporting_spans: [
                "includes a 36-month warranty for personal use"
            ]
        }
    ],
    answer: "The X-15 battery warranty lasts for 36 months for personal use."
};

/**
 * Alternative data for "Fresh" mode divergence
 */
export const DIVERGENT_SCENARIO = {
    ...DEMO_SCENARIO,
    retrieval: [
        {
            url: "https://example.com/news/warranty-update-2026.html",
            text: "Effective Jan 2026, all X-series batteries now feature a 48-month limited warranty. This supersedes previous 36-month agreements.",
        }
    ],
    hypotheses: [
        {
            text: "The X-15 battery now has a 48-month limited warranty.",
            supporting_spans: [
                "now feature a 48-month limited warranty"
            ]
        }
    ],
    answer: "All X-series batteries (including the X-15) now have a 48-month warranty."
};
