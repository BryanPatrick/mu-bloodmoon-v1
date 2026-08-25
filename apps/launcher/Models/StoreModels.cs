namespace BloodMoon.Launcher.Models;

// Launcher Phase L3 -- typed shapes for the existing, already-real
// commerce module (GET /shop/products, POST /shop/purchases) and the new
// StorePurchaseTerms read path (GET /launcher/store/terms/active). Mirrors
// commerce.service.ts's mapProduct() shape exactly -- a public DTO, not the
// raw ShopProduct row (no internalNotes/technicalCode/createdBy/etc).

public sealed class ShopProductVariantDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int? DurationSeconds { get; set; }
    public int Quantity { get; set; } = 1;
    public long Price { get; set; }
    public string Currency { get; set; } = "WCOIN";
    public int? Stock { get; set; }
    public bool Available { get; set; } = true;
}

public sealed class ShopProductDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Short { get; set; }
    public string? Category { get; set; }
    public string? Description { get; set; }
    public long Price { get; set; }
    public string Currency { get; set; } = "WCOIN";
    public string Status { get; set; } = "ACTIVE";
    public int? Stock { get; set; }
    public string? Slug { get; set; }
    public List<string> Images { get; set; } = [];
    public bool Featured { get; set; }
    public string DeliveryTarget { get; set; } = "ACCOUNT";
    public List<ShopProductVariantDto> Variants { get; set; } = [];
}

public sealed class ShopProductListResponse
{
    public List<ShopProductDto> Data { get; set; } = [];
    public int Total { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public int TotalPages { get; set; } = 1;
}

public sealed class StorePurchaseTermsDto
{
    public string Id { get; set; } = "";
    public int Version { get; set; }
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public DateTimeOffset EffectiveAt { get; set; }
    public bool Active { get; set; }
}

public sealed class CreatePurchasePayload
{
    public string ProductId { get; set; } = "";
    public string? VariantId { get; set; }
    public int Quantity { get; set; } = 1;
    public string? DestinationCharacterId { get; set; }
    // Part AL -- required whenever an active StorePurchaseTerms version
    // exists; the backend (commerce.service.ts's createPurchaseIntent)
    // rejects the purchase otherwise. Never omitted by the Launcher once a
    // terms version has been loaded.
    public int? TermsVersion { get; set; }
}

public sealed class PurchaseIntentDto
{
    public string Id { get; set; } = "";
    public string ProductId { get; set; } = "";
    public string? VariantId { get; set; }
    public int Quantity { get; set; } = 1;
    public long Price { get; set; }
    public string Currency { get; set; } = "WCOIN";
    public string Status { get; set; } = "";
    public string CorrelationId { get; set; } = "";
}
