namespace Kendo.Mvc.UI.Html
{
    using Moq;
    using Kendo.Mvc.Infrastructure;
    using Xunit;
    
    public class GridButtonImageDecoratorTests
    {
        private readonly GridButtonImageDecorator decorator;
        private readonly Mock<IGridButtonBuilder> button;
        private readonly IHtmlNode html;

        public GridButtonImageDecoratorTests()
        {
            button = new Mock<IGridButtonBuilder>();
            html = new HtmlElement("button");
            
            decorator = new GridButtonImageDecorator(button.Object);
        }

        [Fact]
        public void Should_create_span()
        {
            decorator.Apply(html);

            html.Children[0].TagName.ShouldEqual("span");
        }
        
        [Fact]
        public void Should_add_icon_class_if_sprite_class_is_not_empty()
        {
            button.Setup(b => b.SpriteCssClass).Returns("foo");

            decorator.Apply(html);

            html.Children[0].Attribute("class").ShouldContain(UIPrimitives.Icon);
        }
        
        [Fact]
        public void Should_add_the_sprite_class()
        {
            button.Setup(b => b.SpriteCssClass).Returns("foo");

            decorator.Apply(html);

            html.Children[0].Attribute("class").Split(' ').ShouldContain("foo");
        }
    }
}
