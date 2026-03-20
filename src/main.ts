// main.ts

import './style.css'
import { getCocktailByID, searchCocktails, searchByIngredient } from "./api.ts";

let searchResults: Cocktail[] = [];
let homePageCocktails: Cocktail[] = [];
let currentPage: "home" | "search" | "detail" | "favorites" = "home";
let currentDetail: Cocktail | null = null;
let favoriteCocktails: Cocktail[] = [];

const searchForm = document.querySelector<HTMLFormElement>("#search-form");
const searchInput = document.querySelector<HTMLInputElement>("#search-input");
const homeButton = document.querySelector<HTMLButtonElement>("#home-button");
const homeGrid = document.querySelector<HTMLElement>("#home-grid");
const favoritesButton = document.querySelector<HTMLButtonElement>("#favorites-button")
const favoritesGrid = document.querySelector<HTMLElement>("#favorites-grid");
const favoritesSection = document.querySelector<HTMLElement>("#page-favorites");
const searchGrid = document.querySelector<HTMLElement>("#search-grid");
const searchHeading = document.querySelector<HTMLElement>("#search-heading");
const detailContent = document.querySelector<HTMLElement>("#detail-content");
const homeSection = document.querySelector<HTMLElement>("#page-home");
const searchSection = document.querySelector<HTMLElement>("#page-search");
const detailSection = document.querySelector<HTMLElement>("#page-detail");


const PRESET_IDS = ["11007", "11000", "11001", "11002", "11003", "17222"];


function render(): void {
    if (
        !homeGrid || !searchGrid || !searchHeading ||
        !detailContent || !homeSection || !searchSection ||
        !detailSection || !favoritesSection || !favoritesGrid
    ) {
        return;
    }

    switch (currentPage) {
        case "home":
            homeSection.style.display = "block";
            searchSection.style.display = "none";
            detailSection.style.display = "none";
            favoritesSection.style.display = "none";
            renderCards(homeGrid, homePageCocktails);
            break;
        case "search":
            homeSection.style.display = "none";
            searchSection.style.display = "block";
            detailSection.style.display = "none";
            favoritesSection.style.display = "none";
            renderCards(searchGrid, searchResults);
            break;
        case "detail":
            homeSection.style.display = "none";
            searchSection.style.display = "none";
            detailSection.style.display = "block";
            favoritesSection.style.display = "none";
            renderDetail();
            break;
        case "favorites":
            homeSection.style.display = "none";
            searchSection.style.display = "none";
            detailSection.style.display = "none";
            favoritesSection.style.display = "block";
            renderCards(favoritesGrid, favoriteCocktails);
            break;
    }
}

function createCocktailCard(cocktail: Cocktail): string {
    const ingredientPreview = cocktail.ingredients
        .slice(0, 3)
        .map(ing => ing.name)
        .join(", ");
    const isFav = favoriteCocktails.some(c => c.id === cocktail.id);

    return `
        <div class="cocktail-card" data-id="${cocktail.id}">
            <img src="${cocktail.thumbnail}/medium" alt="${cocktail.name}" />
            <h3>${cocktail.name}</h3>
            <p class="ingredients-preview">${ingredientPreview}</p>
            <button class="card-fav" data-id="${cocktail.id}">${isFav ? "★" : "☆"}</button>
        </div>
    `;
}

function renderCards(container: HTMLElement, cocktails: Cocktail[]): void {
    const html = [...cocktails]
        .sort((a, b) => b.name.localeCompare(a.name))
        .map(cocktail => createCocktailCard(cocktail))
        .join("");
    container.innerHTML = html;
}

function renderDetail(): void {
    if (!detailContent || !currentDetail) return;

    const cocktail = currentDetail;
    const isFav = favoriteCocktails.some(c => c.id === cocktail.id);
    const ingredientsHTML = cocktail.ingredients
        .map(ing => `<li><strong>${ing.measure}</strong> ${ing.name}</li>`)
        .join("");

    detailContent.innerHTML = `
        <div class="detail-title-row">
            <h1 class="detail-title">${cocktail.name}</h1>
            <button class="fav-toggle" data-id="${cocktail.id}">
                ${isFav ? "★" : "☆"}
            </button>
        </div>
        <div class="detail-body">
            <div class="detail-image-wrapper">
                <img src="${cocktail.thumbnail}" alt="${cocktail.name}" class="detail-image" />
            </div>
            <div class="detail-info">
                <p class="detail-meta">${cocktail.category} · ${cocktail.glass} · ${cocktail.alcoholic}</p>
                <h2>Ingredients</h2>
                <ul class="detail-ingredients">${ingredientsHTML}</ul>
                <h2>Instructions</h2>
                <p class="detail-instructions">${cocktail.instructions}</p>
            </div>
        </div>
    `;

    detailContent.querySelector(".fav-toggle")?.addEventListener("click", () => {
        handleFavoriteToggle(cocktail);
        renderDetail();
    });
}

async function loadHomePage(): Promise<void> {
    const promises = PRESET_IDS.map(id => getCocktailByID(id));
    const results = await Promise.all(promises);

    homePageCocktails = [];
    for (const result of results) {
        if (!(result instanceof Error)) {
            homePageCocktails.push(result);
        }
    }

    render();
}

async function handleSearch(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    const query = searchInput?.value.trim();
    if (!query) return;

    const [byName, byIngredient] = await Promise.all([
        searchCocktails(query),
        searchByIngredient(query),
    ]);

    const seen = new Set<string>();
    const merged: Cocktail[] = [];

    for (const result of [byName, byIngredient]) {
        if (result instanceof Error) continue;
        for (const cocktail of result) {
            if (!seen.has(cocktail.id)) {
                seen.add(cocktail.id);
                merged.push(cocktail);
            }
        }
    }

    if (searchHeading) {
        searchHeading.textContent = merged.length === 0
            ? `No results for "${query}"`
            : `Results for "${query}"`;
    }

    searchResults = merged;
    currentPage = "search";
    render();
}

async function handleCardClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    const target = event.target;
    if (!target) return;
    if (!(target instanceof HTMLElement)) return;

    if (target.classList.contains("card-fav")) {
        const id = target.getAttribute("data-id");
        if (!id) return;
        const cocktail = [...homePageCocktails, ...searchResults, ...favoriteCocktails]
            .find(c => c.id === id);
        if (cocktail) handleFavoriteToggle(cocktail);
        return;
    }

    const card = target.closest(".cocktail-card");
    if (!card) return;
    const id = card.getAttribute("data-id");
    if (!id) throw new Error("Card element has no data-id attribute!");

    const existing = [...homePageCocktails, ...searchResults].find(c => c.id === id);
    if (existing) {
        currentDetail = existing;
        currentPage = "detail";
        render();
    } else {
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

function save(): void {
    const ids = favoriteCocktails.map(c => c.id);
    localStorage.setItem("favorites", JSON.stringify(ids));
}

function load(): void {
    const data = localStorage.getItem("favorites");
    if (!data) return;
    const ids = JSON.parse(data) as string[];
    // Fetch full cocktail data for each saved ID
    Promise.all(ids.map(id => getCocktailByID(id))).then(results => {
        favoriteCocktails = results.filter(r => !(r instanceof Error)) as Cocktail[];
        render();
    });
}

function handleFavoriteToggle(cocktail: Cocktail): void {
    const idx = favoriteCocktails.findIndex(c => c.id === cocktail.id);
    if (idx === -1) {
        favoriteCocktails.push(cocktail);
    } else {
        favoriteCocktails.splice(idx, 1);
    }
    save();
    render();
}

async function main(): Promise<void> {
    load();
    await loadHomePage();

    searchForm?.addEventListener("submit", handleSearch);

    homeGrid?.addEventListener("click", handleCardClick);
    searchGrid?.addEventListener("click", handleCardClick);
    favoritesGrid?.addEventListener("click", handleCardClick);
    homeButton?.addEventListener("click", (e) => {
        e.preventDefault();
        currentPage = "home";
        render();
    });

    favoritesButton?.addEventListener("click", () => {
        currentPage = "favorites";
        render();
    });

    render();
}

main();