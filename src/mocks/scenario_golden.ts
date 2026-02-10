export const GOLDEN_SCENARIO = {
    question: "What is the warranty period for the Pro-X headset?",
    assumptions: [
        "The user purchased the headset in the UK."
    ],
    retrieval: [
        {
            url: "https://support.pro-x.com/warranty",
            text: "The Pro-X headset comes with a 2-year manufacturer warranty in Europe. For the US, the period is 1 year."
        },
        {
            url: "https://shop.pro-x.com/terms",
            text: "Standard shipping for all Pro-X products takes 3-5 business days."
        }
    ],
    hypotheses: [
        {
            text: "The Pro-X headset has a 2-year warranty for UK customers.",
            supporting_spans: ["comes with a 2-year manufacturer warranty in Europe"]
        },
        {
            text: "The Pro-X headset has a 5-year battery life.",
            supporting_spans: [] // Hallucination distractor (no support)
        }
    ],
    answer: "The Pro-X headset has a 2-year warranty for UK customers."
};
