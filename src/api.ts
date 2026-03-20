// api.ts

const BASE_URL = "https://www.thecocktaildb.com/api/json/v1/1";

function extractIngredients(raw: RawCocktail): Ingredients[] {
    const ingredients: Ingredients[] = [];

    for (let i = 1; i <=15; i++) {
        const nameKey = `strIngredient${i}` as keyof RawCocktail;
        const measureKey = `strMeasure${i}` as keyof RawCocktail;

        const name = raw[nameKey];

        if (!name) break;

        ingredients.push({
            name: name,
            measure: raw[measureKey]?.trim() ?? "",
        });
    }
    return ingredients;
}

function transformCocktail(raw: RawCocktail): Cocktail {
    return {
        id: raw.idDrink,
        name: raw.strDrink,
        category: raw.strCategory,
        alcoholic: raw.strAlcoholic,
        glass: raw.strGlass,
        instructions: raw.strInstructions,
        thumbnail: raw.strDrinkThumb,
        ingredients: extractIngredients(raw),
    };
}

export async function searchCocktails(query: string): Promise<Cocktail[] | Error> {
    const url = `${BASE_URL}/search.php?s=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as SearchResponse;

        if (!data.drinks) {
            return [];
        }

        return data.drinks.map(transformCocktail)

    } catch (e) {
        // "e" is typed as "unknown" in TypeScript — you can't just use it.
        // You have to check if it's actually an Error first.
        if (e instanceof Error) {
            return e;
        } else {
            // This probably won't happen, but TypeScript makes us handle it
            return new Error(`Unknown error occurred: ${e}`);
        }
    }
}

export async function getCocktailByID(id: string): Promise<Cocktail | Error> {
    const url = `${BASE_URL}/lookup.php?i=${id}`;

    try{
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`)
        }

        const data = (await response.json()) as SearchResponse;

        if (!data.drinks || data.drinks.length === 0) {
            return new Error(`No cocktail found with ID: ${id}`);
        }

        return transformCocktail(data.drinks[0]);
    } catch (e) {
        if (e instanceof Error) {
            return e;
        } else {
            return new Error(`Unknown error occurred: ${e}`);
        }
    }
}
