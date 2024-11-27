const { readFile, utils } = require("xlsx");
const { createClient } = require("contentful-management");
require("dotenv").config();

const spaceId = process.env.SPACE_ID;
const envOriginId = process.env.ENVIRONMENT_ORIGIN_ID; // MUSINGA
const accessTokenCMA = process.env.ACCESS_TOKEN_CMA;

// Ruta al archivo Excel
const filePath = "./src/excels/datos.xlsx";

// Leer el archivo Excel
function leerExcel(filePath) {
  const file = readFile(filePath);
  const sheetName = file.SheetNames[0];
  const worksheet = file.Sheets[sheetName];
  // Convertir la hoja a un arreglo de objetos JSON
  return utils.sheet_to_json(worksheet);
}

// Función para verificar si el entry ya existe
async function getEntry(environment, contentType, fieldName, fieldValue) {
  try {
    const entries = await environment.getEntries({
      content_type: contentType,
      [`fields.${fieldName}`]: fieldValue,
      limit: 1,
    });
    console.log(`El ${contentType} ya existe`);
    return entries.items[0];
  } catch (error) {
    return false; // Si hubo error, considerar que no existe
  }
}

const CODES_DATA = {
  CASAS: "real-estate-houses",
  EDIFICIOS: "real-estate-buildings",
  DEPARTAMENTOS: "real-estate-departments",
  LOTES: "real-estate-lots",
  LOCALES: "real-estate-premises",
};

const BANNER_DATA = {
  CASAS: `${CODES_DATA["CASAS"]}-banner`,
  EDIFICIOS: `${CODES_DATA["EDIFICIOS"]}-banner`,
  DEPARTAMENTOS: `${CODES_DATA["DEPARTAMENTOS"]}-banner`,
  LOTES: `${CODES_DATA["LOTES"]}-banner`,
  LOCALES: `${CODES_DATA["LOCALES"]}-banner`,
};

const BREADCRUMB_DATA = {
  CASAS: `breadcrumb-${CODES_DATA["CASAS"]}`,
  EDIFICIOS: `breadcrumb-${CODES_DATA["EDIFICIOS"]}`,
  DEPARTAMENTOS: `breadcrumb-${CODES_DATA["DEPARTAMENTOS"]}`,
  LOTES: `breadcrumb-${CODES_DATA["LOTES"]}`,
  LOCALES: `breadcrumb-${CODES_DATA["LOCALES"]}`,
};

const BREADCRUMB_LINK_DATA = {
  CASAS: `fClQKJhkafymIkuHvPDo2`,
  EDIFICIOS: `626u8uMDypIIUKRstaSW9J`,
  DEPARTAMENTOS: `2bM4OJ9HKIBKdolYTwWMn9`,
  LOTES: `3rOQgNt7KCzOg3wtvXdh0J`,
  LOCALES: `xjPYfnxZ9cPXyXJwVXjYn`,
};

const getSys = (contentTypeId, id) => {
  return {
    sys: {
      type: contentTypeId,
      linkType: "Entry",
      id,
    },
  };
};

const createBreadcrumb = async (
  environment,
  { folio, type, idBreadcrumbLink }
) => {
  const fields = {
    internalName: {
      "es-CR": `Miga de pan > Bienes Raíces > Casa > ${folio}`,
    },
    code: {
      "es-CR": `${BREADCRUMB_DATA[type]}-${folio}`,
    },
    quickButton: { "es-CR": getSys("navLink", "1gnXgPl4AqNzZLC3uKar3F") },
    breadcrumbList: {
      "es-CR": [
        { ...getSys("Link", "1vCQmjo4XvfqqxbPIfqYhV") },
        { ...getSys("Link", "c9468MnU2qnWmejfSMNrA") },
        { ...getSys("Link", BREADCRUMB_LINK_DATA[type]) },
        { ...getSys("Link", idBreadcrumbLink) },
      ],
    },
  };

  const breadcrumb = await environment.createEntry("breadCrumbs", {
    fields,
  });

  await breadcrumb.publish();

  return breadcrumb;
};

const createBreadcrumbLink = async (
  environment,
  { folio, type, linkId, name }
) => {
  const breadcrumbLink = await environment.createEntry("navLink", {
    fields: {
      internalName: {
        "es-CR": `Miga de pan > ${folio}`,
      },
      code: {
        "es-CR": `${BREADCRUMB_DATA[type]}-${folio}-link`,
      },
      name: {
        "es-CR": name,
      },
      url: {
        "es-CR": getSys("linkResource", linkId),
      },
    },
  });

  await breadcrumbLink.publish();

  return breadcrumbLink;
};

const createLinkResource = async (environment, { type, url }) => {
  const linkResource = await environment.createEntry("linkResource", {
    fields: {
      key: {
        "es-CR": `bienes-raices.${type}.${url}`,
      },
      link: {
        "es-CR": `/bienes-raices/${type}/${url}/`,
      },
    },
  });

  await linkResource.publish();

  return linkResource;
};

// Subir datos a Contentful
async function subirDatosAContentful(data) {
  try {
    const client = createClient({
      accessToken: accessTokenCMA,
    });

    const space = await client.getSpace(spaceId);
    const environment = await space.getEnvironment(envOriginId);
    // console.log(data);
    for (const item of data) {
      const {
        "Nombre Bien Raíz": nombre,
        Provincia: provincia,
        Cantón: canton,
        Distrito: distrito,
        "Tipo de Bien": tipoDeBien,
        Domitorios: domitorios,
        Baños: banos,
        "Área construida": areaConstruida,
        "Valor inicial": valorInicial,
        "Porcentaje descuento": porcentajeDescuento,
        "Valor final": valorFinal,
        Descripción: descripcion,
        "Folio real": folioReal,
        "Número de plano": numeroDePlano,
        "Área terreno": areaTerreno,
        Dirección: direccion,
        "Coordenadas Mapa": coordenadasMapa,
        "Nombre contacto": nombreContacto,
        "Correo contacto": correoContacto,
        "Teléfono 1": telefono1,
        "Teléfono 2": telefono2,
        Distribución: distribucion,
        Metatitulo: metatitulo,
        Metadescripcion: metadescripcion,
        url,
      } = item;

      console.log(`Procesando: ${nombre}...`);

      const banner = await getEntry(
        environment,
        "transversalContent",
        "code",
        BANNER_DATA[tipoDeBien.toUpperCase()]
      );

      const linkResourceExist = await getEntry(
        environment,
        "linkResource",
        "link",
        `/bienes-raices/${tipoDeBien.toLowerCase()}/${url}/`
      );

      const linkResource =
        linkResourceExist ||
        (await createLinkResource(environment, {
          url,
          type: tipoDeBien.toLowerCase(),
        }));

      const breadcrumbLinkExist = await getEntry(
        environment,
        "navLink",
        "code",
        `${BREADCRUMB_DATA[tipoDeBien.toUpperCase()]}-${folioReal}-link`
      );

      const breadcrumbLink =
        breadcrumbLinkExist ||
        (await createBreadcrumbLink(environment, {
          folio: folioReal,
          type: tipoDeBien.toUpperCase(),
          linkId: linkResource.sys.id,
          name: nombre,
        }));
      console.log(breadcrumbLink);

      const breadcrumbExist = await getEntry(
        environment,
        "breadCrumbs",
        "code",
        `${BREADCRUMB_DATA[tipoDeBien.toUpperCase()]}-${folioReal}`
      );

      const breadcrumb =
        breadcrumbExist ||
        (await createBreadcrumb(environment, {
          folio: folioReal,
          type: tipoDeBien.toUpperCase(),
          idBreadcrumbLink: breadcrumbLink.sys.id,
        }));

      console.log(breadcrumb);

      // console.log(`Entrada creada para: ${item.title}`);
    }
  } catch (error) {
    console.error("Error subiendo datos a Contentful:", error.message);
  }
}

// Ejecutar el proceso
async function main() {
  const datos = leerExcel(filePath);
  // console.log("Datos leídos del Excel:", datos);
  await subirDatosAContentful(datos);
  console.log("Proceso completado.");
}

main();
