COUNTRY_CURRENCY = {
    "USA": "USD",
    "Canada": "CAD",
    "India": "INR",
}


def get_currency(country: str) -> str:
    return COUNTRY_CURRENCY.get(country, "USD")
