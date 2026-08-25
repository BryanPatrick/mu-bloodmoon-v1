using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using BloodMoon.Launcher.Services.Navigation;

namespace BloodMoon.Launcher.Views;

// Part AF-AM -- LOJA. WC/GP/HP only (Part AF: no BRL/USD/Pix/payment
// provider). Reuses the existing, already-real ShopProduct/
// StorePurchaseTerms/POST shop/purchases endpoints -- no mock/local-only
// checkout path was needed (Part AM).
public partial class StorePage : UserControl, ILauncherPage
{
    private LauncherAppContext _context = null!;
    private List<ShopProductDto> _products = [];
    private ShopProductDto? _selected;
    private readonly List<CartLine> _cart = [];
    private StorePurchaseTermsDto? _activeTerms;
    private bool _termsAccepted;

    public StorePage() => InitializeComponent();

    public void Initialize(LauncherAppContext context) => _context = context;

    public bool OnPageLeaving(PageKey to) => true;

    public void OnPageEntering(PageKey from) => _ = RefreshAsync();

    public async Task RefreshAsync()
    {
        var banner = await SlotImageResolver.ResolveAsync(_context, _context.Slots.GetAssetId("store.featuredBannerImage"), CancellationToken.None);
        BannerBorder.Background = banner is not null
            ? new ImageBrush(banner) { Stretch = Stretch.UniformToFill }
            : (Brush)Application.Current.Resources["Brush.BackgroundSurfaceAlt"];

        var currencies = _context.Slots.GetList("store.currencyIcon", element => SlotRegistryMapper.StringField(element, "currency"));
        CurrencyIcons.ItemsSource = currencies.Count > 0 ? currencies : ["WCOIN", "GOBLIN_POINT", "HUNT_POINT"];

        try
        {
            var response = await _context.ApiClient.GetStoreProductsAsync(CancellationToken.None);
            _products = response.Data;
        }
        catch
        {
            _products = [];
            _context.ShowToast?.Invoke(RemoteContentFailureMessages.For(RemoteContentFailureKind.ApiOffline));
        }
        ProductGrid.ItemsSource = _products;
        NoProductsText.Visibility = _products.Count == 0 ? Visibility.Visible : Visibility.Collapsed;

        try
        {
            _activeTerms = await _context.ApiClient.GetActiveTermsAsync(CancellationToken.None);
        }
        catch
        {
            _activeTerms = null;
        }
        TermsContentText.Text = _activeTerms?.Content ?? "";
        UpdateCheckoutEnabled();
    }

    private void ProductCard_Click(object sender, System.Windows.Input.MouseButtonEventArgs e)
    {
        if (sender is not FrameworkElement { DataContext: ShopProductDto product })
        {
            return;
        }
        _selected = product;
        SelectedNameText.Text = product.Name;
        SelectedDescriptionText.Text = product.Short ?? product.Description ?? "";
        SelectedPriceText.Text = $"{product.Price:N0} {product.Currency}";
        AddToCartButton.IsEnabled = true;
    }

    private void AddToCart_Click(object sender, RoutedEventArgs e)
    {
        if (_selected is null)
        {
            return;
        }
        // Part AJ -- never silently sum totals across different
        // currencies. A cart already holding a different currency refuses
        // the add with an explanation rather than producing an invalid
        // combined total.
        var existingCurrency = _cart.Count > 0 ? _cart[0].Product.Currency : null;
        if (existingCurrency is not null && existingCurrency != _selected.Currency)
        {
            _context.ShowToast?.Invoke($"O carrinho já contém itens em {existingCurrency}. Finalize ou limpe antes de adicionar itens em {_selected.Currency}.");
            return;
        }

        var existingLine = _cart.Find(l => l.Product.Id == _selected.Id);
        if (existingLine is not null)
        {
            existingLine.Quantity++;
        }
        else
        {
            _cart.Add(new CartLine(_selected, 1));
        }
        RenderCart();
    }

    private void RemoveCartItem_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button { Tag: CartLine line })
        {
            _cart.Remove(line);
            RenderCart();
        }
    }

    private void RenderCart()
    {
        var rows = _cart.Select(l => new CartRow(
            $"{l.Product.Name} x{l.Quantity}",
            $"{l.Product.Price * l.Quantity:N0} {l.Product.Currency}")).ToList();
        CartItems.ItemsSource = rows;
        EmptyCartText.Visibility = _cart.Count == 0 ? Visibility.Visible : Visibility.Collapsed;

        if (_cart.Count == 0)
        {
            CartTotalText.Text = "";
        }
        else
        {
            var currency = _cart[0].Product.Currency;
            var total = _cart.Sum(l => l.Product.Price * l.Quantity);
            CartTotalText.Text = $"TOTAL: {total:N0} {currency}";
        }
        UpdateCheckoutEnabled();
    }

    private void TermsCheckBox_Changed(object sender, RoutedEventArgs e)
    {
        if (_context is null) return;
        _termsAccepted = TermsCheckBox.IsChecked == true;
        UpdateCheckoutEnabled();
    }

    private void TermsLink_Click(object sender, RoutedEventArgs e)
    {
        TermsContentText.Visibility = TermsContentText.Visibility == Visibility.Visible
            ? Visibility.Collapsed
            : Visibility.Visible;
    }

    // Part AK -- FINALIZAR COMPRA stays disabled until every checkout
    // condition is valid: logged in, cart non-empty, and (only when a
    // terms version actually exists to accept) the checkbox checked.
    private void UpdateCheckoutEnabled()
    {
        var termsSatisfied = _activeTerms is null || _termsAccepted;
        CheckoutButton.IsEnabled = _context.IsLoggedIn && _cart.Count > 0 && termsSatisfied;
    }

    private async void Checkout_Click(object sender, RoutedEventArgs e)
    {
        if (!_context.IsLoggedIn || _context.Session is null)
        {
            _context.RequestLogin?.Invoke();
            return;
        }
        CheckoutButton.IsEnabled = false;
        var succeeded = 0;
        var failed = 0;
        foreach (var line in _cart.ToList())
        {
            try
            {
                await _context.ApiClient.CreatePurchaseAsync(_context.Session.AccessToken, new CreatePurchasePayload
                {
                    ProductId = line.Product.Id,
                    Quantity = line.Quantity,
                    TermsVersion = _activeTerms?.Version
                }, CancellationToken.None);
                succeeded++;
            }
            catch
            {
                failed++;
            }
        }
        _cart.Clear();
        RenderCart();
        _context.ShowToast?.Invoke(failed == 0
            ? $"{succeeded} compra(s) concluída(s) com sucesso."
            : $"{succeeded} compra(s) concluída(s), {failed} falharam.");
    }

    private sealed record CartLine(ShopProductDto Product, int InitialQuantity)
    {
        public int Quantity { get; set; } = InitialQuantity;
    }

    private sealed record CartRow(string Label, string LineTotalLabel);
}
