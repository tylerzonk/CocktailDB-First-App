import './style.css'
import { getCocktailByID, searchCocktails } from "./api.ts";

let searchResults: Cocktail[] = [];
let homePageCocktails: Cocktail[] = [];
let currentPage: "home" | "search" | "detail" = "home";
let currentDetail: Cocktail | null = null;

const searchForm = document.querySelector<HTMLFormElement>("#search-form");
const searchInput = document.querySelector<HTMLInputElement>("#search-input");
const homeButton = document.querySelector<HTMLButtonElement>("#home-button");
const homeGrid = document.querySelector<HTMLElement>("#home-grid");
const searchGrid = document.querySelector<HTMLElement>("#search-grid");
const searchHeading = document.querySelector<HTMLElement>("#search-heading");
const detailContent = document.querySelector<HTMLElement>("#detail-content");
const homeSection = document.querySelector<HTMLElement>("#page-home");
const searchSection = document.querySelector<HTMLElement>("#page-search");
const detailSection = document.querySelector<HTMLElement>("#page-detail");


const PRESET_IDS = ["11007", "11000", "11001", "11002", "11003", "17222"];


function render(): void {
    // Sanity check: if any critical element is missing, bail out early.
    // This means you'll never hit a null reference deeper in the function.
    if (
        !homeGrid || !searchGrid || !searchHeading ||
        !detailContent || !homeSection || !searchSection || !detailSection
    ) {
        return;
    }

    // Show/hide pages based on currentPage state
    switch (currentPage) {
        case "home":
            homeSection.style.display = "block";
            searchSection.style.display = "none";
            detailSection.style.display = "none";
            renderCards(homeGrid, homePageCocktails);
            break;
        case "search":
            homeSection.style.display = "none";
            searchSection.style.display = "block";
            detailSection.style.display = "none";
            renderCards(searchGrid, searchResults);
            break;
        case "detail":
            homeSection.style.display = "none";
            searchSection.style.display = "none";
            detailSection.style.display = "block";
            renderDetail();
            break;
    }
}

function createCocktailCard(cocktail: Cocktail): string {
    const ingredientPreview = cocktail.ingredients
        .slice(0,3)
        .map(ing => ing.name)
        .join(", ");

        return `
            <div class="cocktail-card" data-id="${cocktail.id}">
                <img src="${cocktail.thumbnail}/medium" alt="${cocktail.name}" />
                <h3>${cocktail.name}</h3>
                <p class="ingredients-preview">${ingredientPreview}</p>
            </div>
        `;
}

function renderCards(container: HTMLElement, cocktails: Cocktail[]): void {
    const html = cocktails
        .map(cocktail => createCocktailCard(cocktail))
        .join("");
    container.innerHTML = html;
}

function renderDetail(): void {
    if (!detailContent || !currentDetail) return;

    const cocktail = currentDetail;
    const ingredientsHTML = cocktail.ingredients
        .map(ing => `<li><strong>${ing.measure}</strong> ${ing.name}</li>`)
        .join("");

    detailContent.innerHTML = `
        <img src="${cocktail.thumbnail}" alt="${cocktail.name}" class="detail-image" />
        <h1>${cocktail.name}</h1>
        <p class="detail-meta">${cocktail.category} · ${cocktail.glass} · ${cocktail.alcoholic}</p>
        <h2>Ingredients</h2>
        <ul class="detail-ingredients">${ingredientsHTML}</ul>
        <h2>Instructions</h2>
        <p class="detail-instructions">${cocktail.instructions}</p>
    `;
}

async function loadHomePage(): Promise<void> {
    const promises = PRESET_IDS.map(id => getCocktailByID(id));
    const results = await Promise.all(promises);

    // Filter out any Errors, keep only successful Cocktails
    homePageCocktails = [];
    for (const result of results) {
        if (!(result instanceof Error)) {
            homePageCocktails.push(result);
        }
    }

    render();
}

async function handleSearch(event: SubmitEvent): Promise<void> {
    // Stop the browser from doing its normal form submit (which reloads the page)
    event.preventDefault();

    const query = searchInput?.value;
    // If there's nothing there, just return and don't search
    if (!query) {
        return;
    }

    // Call the API
    const results = await searchCocktails(query);

    // Check if we got an error back — THIS is the pattern your teacher uses
    if (results instanceof Error) {
        alert("Couldn't fetch cocktails, try again later");
        return;
    }

    // Update state, then render
    searchResults = results;
    if (searchHeading) {
        searchHeading.textContent = results.length === 0
            ? `No results for "${query}"`
            : `Results for "${query}"`;
    }
    currentPage = "search";
    render();
}

async function handleCardClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    const target = event.target;

    if (!target) {
        return;
    }

    // Make sure we're dealing with an HTML element (narrows the type)
    if (!(target instanceof HTMLElement)) {
        return;
    }

    // Walk up the DOM to find the card container
    const card = target.closest(".cocktail-card");
    if (!card) return;

    // Get the cocktail ID from the data attribute
    const id = card.getAttribute("data-id");
    // If no ID found, something is wrong with our HTML — throw so we notice
    if (!id) {
        throw new Error("Card element has no data-id attribute!");
    }

    // Try to find the cocktail in our existing data first (avoids an API call)
    const existing = [...homePageCocktails, ...searchResults].find(
        (c) => c.id === id
    );

    if (existing) {
        currentDetail = existing;
        currentPage = "detail";
        render();
    } else {
        // Fall back to API lookup
        const result = await getCocktailByID(id);
        if (result instanceof Error) {
            alert("Couldn't load this drink. Try again later.");
            return;
        }
        currentDetail = result;
        currentPage = "detail";
        render();
    }
}

async function main(): Promise<void> {
    // Load home page data
    await loadHomePage();

    // Wire up the search form (submit event, not click!)
    searchForm?.addEventListener("submit", handleSearch);

    // Wire up card clicks via event delegation on both grids
    homeGrid?.addEventListener("click", handleCardClick);
    searchGrid?.addEventListener("click", handleCardClick);

    // Home button
    homeButton?.addEventListener("click", (e) => {
        e.preventDefault();
        currentPage = "home";
        render();
    });

    // Initial render
    render();
}

main();