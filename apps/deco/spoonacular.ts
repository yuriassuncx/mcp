/**
 * @name SearchRecipesParams
 * @description Parameters for searching recipes through the Spoonacular API.
 */
interface SearchRecipesParams {
  /** @description The natural language recipe search query */
  query?: string;
  /** @description The cuisine(s) of the recipes (comma separated for OR) */
  cuisine?: string;
  /** @description The cuisine(s) the recipes must not match (comma separated for AND) */
  excludeCuisine?: string;
  /** @description The diet(s) for which the recipes must be suitable */
  diet?: string;
  /** @description A comma-separated list of intolerances */
  intolerances?: string;
  /** @description The equipment required */
  equipment?: string;
  /** @description A comma-separated list of ingredients that should be used */
  includeIngredients?: string;
  /** @description A comma-separated list of ingredients that must not be used */
  excludeIngredients?: string;
  /** @description The type of recipe */
  type?: string;
  /** @description Whether the recipes must have instructions */
  instructionsRequired?: boolean;
  /** @description Add information about the ingredients */
  fillIngredients?: boolean;
  /** @description Get more information about the recipes returned */
  addRecipeInformation?: boolean;
  /** @description Get analyzed instructions for each recipe */
  addRecipeInstructions?: boolean;
  /** @description Get nutritional information for each recipe */
  addRecipeNutrition?: boolean;
  /** @description The username of the recipe author */
  author?: string;
  /** @description User defined tags that have to match */
  tags?: string;
  /** @description The id of the recipe box to search within */
  recipeBoxId?: number;
  /** @description Text that must be found in the title */
  titleMatch?: string;
  /** @description Maximum preparation time in minutes */
  maxReadyTime?: number;
  /** @description Minimum number of servings */
  minServings?: number;
  /** @description Maximum number of servings */
  maxServings?: number;
  /** @description Whether to ignore typical pantry items */
  ignorePantry?: boolean;
  /** @description The strategy to sort recipes by */
  sort?: string;
  /** @description The direction in which to sort (asc or desc) */
  sortDirection?: string;
  /** @description Minimum amount of carbohydrates in grams per serving */
  minCarbs?: number;
  /** @description Maximum amount of carbohydrates in grams per serving */
  maxCarbs?: number;
  /** @description Minimum amount of protein in grams per serving */
  minProtein?: number;
  /** @description Maximum amount of protein in grams per serving */
  maxProtein?: number;
  /** @description Minimum amount of calories per serving */
  minCalories?: number;
  /** @description Maximum amount of calories per serving */
  maxCalories?: number;
  /** @description Minimum amount of fat in grams per serving */
  minFat?: number;
  /** @description Maximum amount of fat in grams per serving */
  maxFat?: number;
  /** @description Minimum amount of alcohol in grams per serving */
  minAlcohol?: number;
  /** @description Maximum amount of alcohol in grams per serving */
  maxAlcohol?: number;
  /** @description Minimum amount of caffeine in milligrams per serving */
  minCaffeine?: number;
  /** @description Maximum amount of caffeine in milligrams per serving */
  maxCaffeine?: number;
  /** @description Minimum amount of copper in milligrams per serving */
  minCopper?: number;
  /** @description Maximum amount of copper in milligrams per serving */
  maxCopper?: number;
  /** @description Minimum amount of calcium in milligrams per serving */
  minCalcium?: number;
  /** @description Maximum amount of calcium in milligrams per serving */
  maxCalcium?: number;
  /** @description Minimum amount of choline in milligrams per serving */
  minCholine?: number;
  /** @description Maximum amount of choline in milligrams per serving */
  maxCholine?: number;
  /** @description Minimum amount of cholesterol in milligrams per serving */
  minCholesterol?: number;
  /** @description Maximum amount of cholesterol in milligrams per serving */
  maxCholesterol?: number;
  /** @description Minimum amount of fluoride in milligrams per serving */
  minFluoride?: number;
  /** @description Maximum amount of fluoride in milligrams per serving */
  maxFluoride?: number;
  /** @description Minimum amount of saturated fat in grams per serving */
  minSaturatedFat?: number;
  /** @description Maximum amount of saturated fat in grams per serving */
  maxSaturatedFat?: number;
  /** @description Minimum amount of Vitamin A in IU per serving */
  minVitaminA?: number;
  /** @description Maximum amount of Vitamin A in IU per serving */
  maxVitaminA?: number;
  /** @description Minimum amount of Vitamin C in milligrams per serving */
  minVitaminC?: number;
  /** @description Maximum amount of Vitamin C in milligrams per serving */
  maxVitaminC?: number;
  /** @description Minimum amount of Vitamin D in micrograms per serving */
  minVitaminD?: number;
  /** @description Maximum amount of Vitamin D in micrograms per serving */
  maxVitaminD?: number;
  /** @description Minimum amount of Vitamin E in milligrams per serving */
  minVitaminE?: number;
  /** @description Maximum amount of Vitamin E in milligrams per serving */
  maxVitaminE?: number;
  /** @description Minimum amount of Vitamin K in micrograms per serving */
  minVitaminK?: number;
  /** @description Maximum amount of Vitamin K in micrograms per serving */
  maxVitaminK?: number;
  /** @description Minimum amount of Vitamin B1 in milligrams per serving */
  minVitaminB1?: number;
  /** @description Maximum amount of Vitamin B1 in milligrams per serving */
  maxVitaminB1?: number;
  /** @description Minimum amount of Vitamin B2 in milligrams per serving */
  minVitaminB2?: number;
  /** @description Maximum amount of Vitamin B2 in milligrams per serving */
  maxVitaminB2?: number;
  /** @description Minimum amount of Vitamin B5 in milligrams per serving */
  minVitaminB5?: number;
  /** @description Maximum amount of Vitamin B5 in milligrams per serving */
  maxVitaminB5?: number;
  /** @description Minimum amount of Vitamin B3 in milligrams per serving */
  minVitaminB3?: number;
  /** @description Maximum amount of Vitamin B3 in milligrams per serving */
  maxVitaminB3?: number;
  /** @description Minimum amount of Vitamin B6 in milligrams per serving */
  minVitaminB6?: number;
  /** @description Maximum amount of Vitamin B6 in milligrams per serving */
  maxVitaminB6?: number;
  /** @description Minimum amount of Vitamin B12 in micrograms per serving */
  minVitaminB12?: number;
  /** @description Maximum amount of Vitamin B12 in micrograms per serving */
  maxVitaminB12?: number;
  /** @description Minimum amount of fiber in grams per serving */
  minFiber?: number;
  /** @description Maximum amount of fiber in grams per serving */
  maxFiber?: number;
  /** @description Minimum amount of folate in micrograms per serving */
  minFolate?: number;
  /** @description Maximum amount of folate in micrograms per serving */
  maxFolate?: number;
  /** @description Minimum amount of folic acid in micrograms per serving */
  minFolicAcid?: number;
  /** @description Maximum amount of folic acid in micrograms per serving */
  maxFolicAcid?: number;
  /** @description Minimum amount of iodine in micrograms per serving */
  minIodine?: number;
  /** @description Maximum amount of iodine in micrograms per serving */
  maxIodine?: number;
  /** @description Minimum amount of iron in milligrams per serving */
  minIron?: number;
  /** @description Maximum amount of iron in milligrams per serving */
  maxIron?: number;
  /** @description Minimum amount of magnesium in milligrams per serving */
  minMagnesium?: number;
  /** @description Maximum amount of magnesium in milligrams per serving */
  maxMagnesium?: number;
  /** @description Minimum amount of manganese in milligrams per serving */
  minManganese?: number;
  /** @description Maximum amount of manganese in milligrams per serving */
  maxManganese?: number;
  /** @description Minimum amount of phosphorus in milligrams per serving */
  minPhosphorus?: number;
  /** @description Maximum amount of phosphorus in milligrams per serving */
  maxPhosphorus?: number;
  /** @description Minimum amount of potassium in milligrams per serving */
  minPotassium?: number;
  /** @description Maximum amount of potassium in milligrams per serving */
  maxPotassium?: number;
  /** @description Minimum amount of selenium in micrograms per serving */
  minSelenium?: number;
  /** @description Maximum amount of selenium in micrograms per serving */
  maxSelenium?: number;
  /** @description Minimum amount of sodium in milligrams per serving */
  minSodium?: number;
  /** @description Maximum amount of sodium in milligrams per serving */
  maxSodium?: number;
  /** @description Minimum amount of sugar in grams per serving */
  minSugar?: number;
  /** @description Maximum amount of sugar in grams per serving */
  maxSugar?: number;
  /** @description Minimum amount of zinc in milligrams per serving */
  minZinc?: number;
  /** @description Maximum amount of zinc in milligrams per serving */
  maxZinc?: number;
  /** @description The number of results to skip (between 0 and 900) */
  offset?: number;
  /** @description The number of expected results (between 1 and 100) */
  number?: number;
}

/**
 * @name Recipe
 * @description A recipe result from the Spoonacular API.
 */
interface Recipe {
  /** @description Unique identifier for the recipe */
  id: number;
  /** @description Title of the recipe */
  title: string;
  /** @description URL of the recipe image */
  image: string;
  /** @description Type of the image file */
  imageType: string;
}

/**
 * @name SearchRecipesResponse
 * @description Response from the Spoonacular complex search API.
 */
interface SearchRecipesResponse {
  /** @description The number of results skipped */
  offset: number;
  /** @description The number of results returned */
  number: number;
  /** @description The list of recipe results */
  results: Recipe[];
  /** @description The total number of results available */
  totalResults: number;
}

/**
 * Constructs a URL with query parameters
 * @param baseUrl - The base URL
 * @param params - The query parameters
 * @returns The complete URL with query parameters
 */
function constructUrl(baseUrl: string, params: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(baseUrl);
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  }
  
  return url.toString();
}

export default class SpoonacularClient {
  private apiKey: string;
  private baseUrl: string;
  
  /**
   * @name SPOONACULAR_CLIENT
   * @description Initializes the Spoonacular API client.
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.spoonacular.com";
  }
  
  /**
   * @description Search through thousands of recipes using advanced filtering and ranking.
   * @param params - The search parameters
   * @returns A promise resolving to the search results
   */
  public async searchRecipes(params: SearchRecipesParams): Promise<SearchRecipesResponse> {
    const endpoint = `${this.baseUrl}/recipes/complexSearch`;
    
    // Add API key to parameters
    const requestParams = {
      ...params,
      apiKey: this.apiKey
    };
    
    const url = constructUrl(endpoint, requestParams);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to search recipes: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<SearchRecipesResponse>;
  }
} 