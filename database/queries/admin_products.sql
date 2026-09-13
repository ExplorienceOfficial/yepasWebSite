-- SQL Server 2005 compatible, read-only catalogue query.
-- U_STOK_ID is the business key; RS_URUNLER_UST.ID is not the stock ID.
-- A_STOK_ID = 0 denotes a product without a lower variant.
SELECT
    U.U_STOK_ID,
    S.STOK_KODU,
    U.U_STOK_ADI,
    U.STOK_GRUP_ID,
    ISNULL(A.ID, 0) AS A_STOK_ID,
    A.A_STOK_ADI
FROM D00013.RS_URUNLER_UST AS U
INNER JOIN D00013.STOK AS S
    ON S.STOK_ID = U.U_STOK_ID
LEFT JOIN D00013.RS_URUNLER_ALT AS A
    ON A.U_STOK_ID = U.U_STOK_ID
ORDER BY U.U_STOK_ADI, A.A_STOK_ADI, U.U_STOK_ID, A.ID;
