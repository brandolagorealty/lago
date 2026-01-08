export type Translations = {
    common: {
        loading: string;
        error: string;
        success: string;
        save: string;
        cancel: string;
        submit: string;
        beds: string;
        baths: string;
        sqft: string;
        featured: string;
    };
    navbar: {
        home: string;
        listings: string;
        about: string;
        contact: string;
        listProperty: string;
    };
    hero: {
        title: string;
        subtitle: string;
        stats_years: string;
        stats_volume: string;
        search: {
            location: string;
            locationPlaceholder: string;
            type: string;
            price: string;
            pricePlaceholder: string;
            operation: string; // New: Operation type (Buy/Rent)
            button: string;
        };
        types: {
            any: string;
            house: string;
            apartment: string;
            commercial: string;
            land: string;
            sale: string; // New
            rent: string; // New
        };
    };
    about: {
        tagline: string;
        title: string;
        mission: string;
        missionContent: string;
        vision: string;
        visionContent: string;
        years: string;
        volume: string;
    };
    form: {
        title: string;
        subtitle: string;
        labels: {
            title: string;
            price: string;
            type: string;
            location: string;
            beds: string;
            baths: string;
            sqft: string;
            description: string;
        };
        placeholders: {
            title: string;
            price: string;
            location: string;
            description: string;
        };
        submit: string;
        submitting: string;
        successTitle: string;
        successMessage: string;
        errorTitle: string;
    };
    listings: {
        selected: string;
        featured: string;
        browseAll: string;
        title: string;
        showingResults: string;
        noResults: string;
        clearFilters: string;
    };
    ai: {
        welcome: string;
        placeholder: string;
        title: string;
        alwaysAvailable: string;
    };
    details: {
        notFound: string;
        returnHome: string;
        priceLabel: string;
        perMonth: string;
        description: string;
        features: string;
        general: string;
        interior: string;
        exterior: string;
        schedule: string;
        contactAgent: string;
        officialAgent: string;
    };
    footer: {
        description: string;
        quickLinks: string;
        legal: string;
        social: string;
        contact: string;
        rights: string;
    };
    support: {
        privacy: {
            title: string;
            content: string;
        };
        terms: {
            title: string;
            content: string;
        };
        contact: {
            title: string;
            subtitle: string;
            name: string;
            email: string;
            message: string;
            send: string;
            info: string;
        };
    };
};
