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
    const url = `${BASE_URL}/search.php?s=${encodeURI(query)}`;

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
        if (e instanceof Error) {
            return e;
        } else {
            return new Error(`Unknown error occurred: ${e}`);
        }
    }
}

export async function searchByIngredient(ingredient: string): Promise<Cocktail[] | Error> {
    const url = `${BASE_URL}/filter.php?i=${encodeURI(ingredient)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as SearchResponse;

        if (!data.drinks) {
            return [];
        }

        const results = await Promise.all(
            data.drinks.slice(0, 12).map(d => getCocktailByID(d.idDrink))
        );

        return results.filter(r => !(r instanceof Error)) as Cocktail[];

    } catch (e) {
        if (e instanceof Error) {
            return e;
        } else {
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
