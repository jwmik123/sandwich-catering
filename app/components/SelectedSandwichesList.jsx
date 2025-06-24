import { isDrink } from "@/lib/product-helpers";

const SelectedSandwichesList = ({
  selections,
  sandwichOptions,
  onRemove,
  breadTypes,
}) => {
  // Group selections by sandwich
  const groupedSelections = Object.entries(selections)
    .map(([sandwichId, sandwichSelections]) => {
      const sandwich = sandwichOptions.find((s) => s._id === sandwichId);
      return {
        sandwich,
        selections: sandwichSelections,
      };
    })
    .filter((group) => group.selections.length > 0);

  // Separate drinks and sandwiches
  const drinkSelections = groupedSelections.filter(({ sandwich }) =>
    isDrink(sandwich)
  );
  const sandwichSelections = groupedSelections.filter(
    ({ sandwich }) => !isDrink(sandwich)
  );

  if (groupedSelections.length === 0) {
    return (
      <div className="bg-muted p-4 rounded-lg text-muted-foreground text-center mt-8">
        No items selected
      </div>
    );
  }

  // Helper function to get sauce name
  const getSauceName = (sandwich, sauceId) => {
    if (sauceId === "geen") return "";
    const sauceOption = sandwich.sauceOptions?.find(
      (sauce) => sauce.name === sauceId
    );
    return sauceOption ? ` with ${sauceOption.name}` : "";
  };

  // Helper function to get topping name
  const getToppingName = (sandwich, toppings) => {
    if (!toppings || toppings.length === 0) return "";

    const toppingNames = toppings.map((toppingName) => {
      const toppingOption = sandwich.toppingOptions?.find(
        (topping) => topping.name === toppingName
      );
      return toppingOption ? toppingOption.name : toppingName;
    });

    return toppingNames.length > 0 ? ` with ${toppingNames.join(", ")}` : "";
  };

  return (
    <div className="bg-custom-gray/10 px-4 py-2 mt-8 rounded-lg">
      <div className="divide-y divide-gray-300">
        {/* Render Sandwiches */}
        {sandwichSelections.length > 0 && (
          <div>
            {sandwichSelections.map(({ sandwich, selections }) => (
              <div key={sandwich._id} className="space-y-2 py-4">
                <div className="font-medium">{sandwich.name}</div>
                {selections.map((selection, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm text-custom-gray pl-4"
                  >
                    <span>
                      {selection.quantity}x -{" "}
                      {
                        breadTypes.find((b) => b.id === selection.breadType)
                          ?.name
                      }
                      {getSauceName(sandwich, selection.sauce)}
                      {getToppingName(sandwich, selection.toppings)}
                    </span>
                    <button
                      onClick={() => onRemove(sandwich._id, index)}
                      className="text-red-500 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Render Drinks */}
        {drinkSelections.length > 0 && (
          <div>
            {drinkSelections.map(({ sandwich, selections }) => (
              <div key={sandwich._id} className="space-y-2 py-4">
                <div className="font-medium">{sandwich.name}</div>
                {selections.map((selection, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm text-custom-gray pl-4"
                  >
                    <span>
                      {selection.quantity}x
                      {getSauceName(sandwich, selection.sauce)}
                      {getToppingName(sandwich, selection.toppings)}
                    </span>
                    <button
                      onClick={() => onRemove(sandwich._id, index)}
                      className="text-red-500 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectedSandwichesList;
