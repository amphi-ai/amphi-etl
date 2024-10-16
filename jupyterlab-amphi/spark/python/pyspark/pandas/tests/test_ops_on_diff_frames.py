#
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

from distutils.version import LooseVersion
from itertools import product
import unittest

import pandas as pd
import numpy as np

from pyspark import pandas as ps
from pyspark.pandas.config import set_option, reset_option
from pyspark.pandas.frame import DataFrame
from pyspark.testing.pandasutils import PandasOnSparkTestCase
from pyspark.testing.sqlutils import SQLTestUtils
from pyspark.pandas.typedef.typehints import (
    extension_dtypes,
    extension_dtypes_available,
    extension_float_dtypes_available,
    extension_object_dtypes_available,
)


class OpsOnDiffFramesEnabledTestsMixin:
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        set_option("compute.ops_on_diff_frames", True)

    @classmethod
    def tearDownClass(cls):
        reset_option("compute.ops_on_diff_frames")
        super().tearDownClass()

    @property
    def pdf1(self):
        return pd.DataFrame(
            {"a": [1, 2, 3, 4, 5, 6, 7, 8, 9], "b": [4, 5, 6, 3, 2, 1, 0, 0, 0]},
            index=[0, 1, 3, 5, 6, 8, 9, 10, 11],
        )

    @property
    def pdf2(self):
        return pd.DataFrame(
            {"a": [9, 8, 7, 6, 5, 4, 3, 2, 1], "b": [0, 0, 0, 4, 5, 6, 1, 2, 3]},
            index=list(range(9)),
        )

    @property
    def pdf3(self):
        return pd.DataFrame(
            {"b": [1, 1, 1, 1, 1, 1, 1, 1, 1], "c": [1, 1, 1, 1, 1, 1, 1, 1, 1]},
            index=list(range(9)),
        )

    @property
    def pdf4(self):
        return pd.DataFrame(
            {"e": [2, 2, 2, 2, 2, 2, 2, 2, 2], "f": [2, 2, 2, 2, 2, 2, 2, 2, 2]},
            index=list(range(9)),
        )

    @property
    def pdf5(self):
        return pd.DataFrame(
            {
                "a": [1, 2, 3, 4, 5, 6, 7, 8, 9],
                "b": [4, 5, 6, 3, 2, 1, 0, 0, 0],
                "c": [4, 5, 6, 3, 2, 1, 0, 0, 0],
            },
            index=[0, 1, 3, 5, 6, 8, 9, 10, 11],
        ).set_index(["a", "b"])

    @property
    def pdf6(self):
        return pd.DataFrame(
            {
                "a": [9, 8, 7, 6, 5, 4, 3, 2, 1],
                "b": [0, 0, 0, 4, 5, 6, 1, 2, 3],
                "c": [9, 8, 7, 6, 5, 4, 3, 2, 1],
                "e": [4, 5, 6, 3, 2, 1, 0, 0, 0],
            },
            index=list(range(9)),
        ).set_index(["a", "b"])

    @property
    def pser1(self):
        midx = pd.MultiIndex(
            [["lama", "cow", "falcon", "koala"], ["speed", "weight", "length", "power"]],
            [[0, 3, 1, 1, 1, 2, 2, 2], [0, 2, 0, 3, 2, 0, 1, 3]],
        )
        return pd.Series([45, 200, 1.2, 30, 250, 1.5, 320, 1], index=midx)

    @property
    def pser2(self):
        midx = pd.MultiIndex(
            [["lama", "cow", "falcon"], ["speed", "weight", "length"]],
            [[0, 0, 0, 1, 1, 1, 2, 2, 2], [0, 1, 2, 0, 1, 2, 0, 1, 2]],
        )
        return pd.Series([-45, 200, -1.2, 30, -250, 1.5, 320, 1, -0.3], index=midx)

    @property
    def pser3(self):
        midx = pd.MultiIndex(
            [["koalas", "cow", "falcon"], ["speed", "weight", "length"]],
            [[0, 0, 0, 1, 1, 1, 2, 2, 2], [1, 1, 2, 0, 0, 2, 2, 2, 1]],
        )
        return pd.Series([45, 200, 1.2, 30, 250, 1.5, 320, 1, 0.3], index=midx)

    @property
    def psdf1(self):
        return ps.from_pandas(self.pdf1)

    @property
    def psdf2(self):
        return ps.from_pandas(self.pdf2)

    @property
    def psdf3(self):
        return ps.from_pandas(self.pdf3)

    @property
    def psdf4(self):
        return ps.from_pandas(self.pdf4)

    @property
    def psdf5(self):
        return ps.from_pandas(self.pdf5)

    @property
    def psdf6(self):
        return ps.from_pandas(self.pdf6)

    @property
    def psser1(self):
        return ps.from_pandas(self.pser1)

    @property
    def psser2(self):
        return ps.from_pandas(self.pser2)

    @property
    def psser3(self):
        return ps.from_pandas(self.pser3)

    def test_ranges(self):
        self.assert_eq(
            (ps.range(10) + ps.range(10)).sort_index(),
            (
                ps.DataFrame({"id": list(range(10))}) + ps.DataFrame({"id": list(range(10))})
            ).sort_index(),
        )

    def test_no_matched_index(self):
        with self.assertRaisesRegex(ValueError, "Index names must be exactly matched"):
            ps.DataFrame({"a": [1, 2, 3]}).set_index("a") + ps.DataFrame(
                {"b": [1, 2, 3]}
            ).set_index("b")

    def test_arithmetic(self):
        self._test_arithmetic_frame(self.pdf1, self.pdf2, check_extension=False)
        self._test_arithmetic_series(self.pser1, self.pser2, check_extension=False)

    @unittest.skipIf(not extension_dtypes_available, "pandas extension dtypes are not available")
    def test_arithmetic_extension_dtypes(self):
        self._test_arithmetic_frame(
            self.pdf1.astype("Int64"), self.pdf2.astype("Int64"), check_extension=True
        )
        self._test_arithmetic_series(
            self.pser1.astype(int).astype("Int64"),
            self.pser2.astype(int).astype("Int64"),
            check_extension=True,
        )

    @unittest.skipIf(
        not extension_float_dtypes_available, "pandas extension float dtypes are not available"
    )
    def test_arithmetic_extension_float_dtypes(self):
        self._test_arithmetic_frame(
            self.pdf1.astype("Float64"), self.pdf2.astype("Float64"), check_extension=True
        )
        self._test_arithmetic_series(
            self.pser1.astype("Float64"), self.pser2.astype("Float64"), check_extension=True
        )

    def _test_arithmetic_frame(self, pdf1, pdf2, *, check_extension):
        psdf1 = ps.from_pandas(pdf1)
        psdf2 = ps.from_pandas(pdf2)

        def assert_eq(actual, expected):
            if LooseVersion("1.1") <= LooseVersion(pd.__version__) < LooseVersion("1.2.2"):
                self.assert_eq(actual, expected, check_exact=not check_extension)
                if check_extension:
                    if isinstance(actual, DataFrame):
                        for dtype in actual.dtypes:
                            self.assertTrue(isinstance(dtype, extension_dtypes))
                    else:
                        self.assertTrue(isinstance(actual.dtype, extension_dtypes))
            else:
                self.assert_eq(actual, expected)

        # Series
        assert_eq((psdf1.a - psdf2.b).sort_index(), (pdf1.a - pdf2.b).sort_index())

        assert_eq((psdf1.a * psdf2.a).sort_index(), (pdf1.a * pdf2.a).sort_index())

        if check_extension and not extension_float_dtypes_available:
            self.assert_eq(
                (psdf1["a"] / psdf2["a"]).sort_index(), (pdf1["a"] / pdf2["a"]).sort_index()
            )
        else:
            assert_eq((psdf1["a"] / psdf2["a"]).sort_index(), (pdf1["a"] / pdf2["a"]).sort_index())

        # DataFrame
        assert_eq((psdf1 + psdf2).sort_index(), (pdf1 + pdf2).sort_index())

        # Multi-index columns
        columns = pd.MultiIndex.from_tuples([("x", "a"), ("x", "b")])
        psdf1.columns = columns
        psdf2.columns = columns
        pdf1.columns = columns
        pdf2.columns = columns

        # Series
        assert_eq(
            (psdf1[("x", "a")] - psdf2[("x", "b")]).sort_index(),
            (pdf1[("x", "a")] - pdf2[("x", "b")]).sort_index(),
        )

        assert_eq(
            (psdf1[("x", "a")] - psdf2["x"]["b"]).sort_index(),
            (pdf1[("x", "a")] - pdf2["x"]["b"]).sort_index(),
        )

        assert_eq(
            (psdf1["x"]["a"] - psdf2[("x", "b")]).sort_index(),
            (pdf1["x"]["a"] - pdf2[("x", "b")]).sort_index(),
        )

        # DataFrame
        assert_eq((psdf1 + psdf2).sort_index(), (pdf1 + pdf2).sort_index())

    def _test_arithmetic_series(self, pser1, pser2, *, check_extension):
        psser1 = ps.from_pandas(pser1)
        psser2 = ps.from_pandas(pser2)

        def assert_eq(actual, expected):
            if LooseVersion("1.1") <= LooseVersion(pd.__version__) < LooseVersion("1.2.2"):
                self.assert_eq(actual, expected, check_exact=not check_extension)
                if check_extension:
                    self.assertTrue(isinstance(actual.dtype, extension_dtypes))
            else:
                self.assert_eq(actual, expected)

        # MultiIndex Series
        assert_eq((psser1 + psser2).sort_index(), (pser1 + pser2).sort_index())

        assert_eq((psser1 - psser2).sort_index(), (pser1 - pser2).sort_index())

        assert_eq((psser1 * psser2).sort_index(), (pser1 * pser2).sort_index())

        if check_extension and not extension_float_dtypes_available:
            self.assert_eq((psser1 / psser2).sort_index(), (pser1 / pser2).sort_index())
        else:
            assert_eq((psser1 / psser2).sort_index(), (pser1 / pser2).sort_index())

    def test_arithmetic_chain(self):
        self._test_arithmetic_chain_frame(self.pdf1, self.pdf2, self.pdf3, check_extension=False)
        self._test_arithmetic_chain_series(
            self.pser1, self.pser2, self.pser3, check_extension=False
        )

    @unittest.skipIf(not extension_dtypes_available, "pandas extension dtypes are not available")
    def test_arithmetic_chain_extension_dtypes(self):
        self._test_arithmetic_chain_frame(
            self.pdf1.astype("Int64"),
            self.pdf2.astype("Int64"),
            self.pdf3.astype("Int64"),
            check_extension=True,
        )
        self._test_arithmetic_chain_series(
            self.pser1.astype(int).astype("Int64"),
            self.pser2.astype(int).astype("Int64"),
            self.pser3.astype(int).astype("Int64"),
            check_extension=True,
        )

    @unittest.skipIf(
        not extension_float_dtypes_available, "pandas extension float dtypes are not available"
    )
    def test_arithmetic_chain_extension_float_dtypes(self):
        self._test_arithmetic_chain_frame(
            self.pdf1.astype("Float64"),
            self.pdf2.astype("Float64"),
            self.pdf3.astype("Float64"),
            check_extension=True,
        )
        self._test_arithmetic_chain_series(
            self.pser1.astype("Float64"),
            self.pser2.astype("Float64"),
            self.pser3.astype("Float64"),
            check_extension=True,
        )

    def _test_arithmetic_chain_frame(self, pdf1, pdf2, pdf3, *, check_extension):
        psdf1 = ps.from_pandas(pdf1)
        psdf2 = ps.from_pandas(pdf2)
        psdf3 = ps.from_pandas(pdf3)

        common_columns = set(psdf1.columns).intersection(psdf2.columns).intersection(psdf3.columns)

        def assert_eq(actual, expected):
            if LooseVersion("1.1") <= LooseVersion(pd.__version__) < LooseVersion("1.2.2"):
                self.assert_eq(actual, expected, check_exact=not check_extension)
                if check_extension:
                    if isinstance(actual, DataFrame):
                        for column, dtype in zip(actual.columns, actual.dtypes):
                            if column in common_columns:
                                self.assertTrue(isinstance(dtype, extension_dtypes))
                            else:
                                self.assertFalse(isinstance(dtype, extension_dtypes))
                    else:
                        self.assertTrue(isinstance(actual.dtype, extension_dtypes))
            else:
                self.assert_eq(actual, expected)

        # Series
        assert_eq(
            (psdf1.a - psdf2.b - psdf3.c).sort_index(), (pdf1.a - pdf2.b - pdf3.c).sort_index()
        )

        assert_eq(
            (psdf1.a * (psdf2.a * psdf3.c)).sort_index(), (pdf1.a * (pdf2.a * pdf3.c)).sort_index()
        )

        if check_extension and not extension_float_dtypes_available:
            self.assert_eq(
                (psdf1["a"] / psdf2["a"] / psdf3["c"]).sort_index(),
                (pdf1["a"] / pdf2["a"] / pdf3["c"]).sort_index(),
            )
        else:
            assert_eq(
                (psdf1["a"] / psdf2["a"] / psdf3["c"]).sort_index(),
                (pdf1["a"] / pdf2["a"] / pdf3["c"]).sort_index(),
            )

        # DataFrame
        if check_extension and LooseVersion(pd.__version__) < LooseVersion("1.1"):
            self.assert_eq(
                (psdf1 + psdf2 - psdf3).sort_index(), (pdf1 + pdf2 - pdf3).sort_index(), almost=True
            )
        else:
            assert_eq((psdf1 + psdf2 - psdf3).sort_index(), (pdf1 + pdf2 - pdf3).sort_index())

        # Multi-index columns
        columns = pd.MultiIndex.from_tuples([("x", "a"), ("x", "b")])
        psdf1.columns = columns
        psdf2.columns = columns
        pdf1.columns = columns
        pdf2.columns = columns
        columns = pd.MultiIndex.from_tuples([("x", "b"), ("y", "c")])
        psdf3.columns = columns
        pdf3.columns = columns

        common_columns = set(psdf1.columns).intersection(psdf2.columns).intersection(psdf3.columns)

        # Series
        assert_eq(
            (psdf1[("x", "a")] - psdf2[("x", "b")] - psdf3[("y", "c")]).sort_index(),
            (pdf1[("x", "a")] - pdf2[("x", "b")] - pdf3[("y", "c")]).sort_index(),
        )

        assert_eq(
            (psdf1[("x", "a")] * (psdf2[("x", "b")] * psdf3[("y", "c")])).sort_index(),
            (pdf1[("x", "a")] * (pdf2[("x", "b")] * pdf3[("y", "c")])).sort_index(),
        )

        # DataFrame
        if check_extension and LooseVersion(pd.__version__) < LooseVersion("1.1"):
            self.assert_eq(
                (psdf1 + psdf2 - psdf3).sort_index(), (pdf1 + pdf2 - pdf3).sort_index(), almost=True
            )
        else:
            assert_eq((psdf1 + psdf2 - psdf3).sort_index(), (pdf1 + pdf2 - pdf3).sort_index())

    def _test_arithmetic_chain_series(self, pser1, pser2, pser3, *, check_extension):
        psser1 = ps.from_pandas(pser1)
        psser2 = ps.from_pandas(pser2)
        psser3 = ps.from_pandas(pser3)

        def assert_eq(actual, expected):
            if LooseVersion("1.1") <= LooseVersion(pd.__version__) < LooseVersion("1.2.2"):
                self.assert_eq(actual, expected, check_exact=not check_extension)
                if check_extension:
                    self.assertTrue(isinstance(actual.dtype, extension_dtypes))
            else:
                self.assert_eq(actual, expected)

        # MultiIndex Series
        assert_eq((psser1 + psser2 - psser3).sort_index(), (pser1 + pser2 - pser3).sort_index())

        assert_eq((psser1 * psser2 * psser3).sort_index(), (pser1 * pser2 * pser3).sort_index())

        if check_extension and not extension_float_dtypes_available:
            self.assert_eq(
                (psser1 - psser2 / psser3).sort_index(), (pser1 - pser2 / pser3).sort_index()
            )
        else:
            assert_eq((psser1 - psser2 / psser3).sort_index(), (pser1 - pser2 / pser3).sort_index())

        assert_eq((psser1 + psser2 * psser3).sort_index(), (pser1 + pser2 * pser3).sort_index())

    def test_mod(self):
        pser = pd.Series([100, None, -300, None, 500, -700])
        pser_other = pd.Series([-150] * 6)
        psser = ps.from_pandas(pser)
        psser_other = ps.from_pandas(pser_other)

        self.assert_eq(psser.mod(psser_other).sort_index(), pser.mod(pser_other))
        self.assert_eq(psser.mod(psser_other).sort_index(), pser.mod(pser_other))
        self.assert_eq(psser.mod(psser_other).sort_index(), pser.mod(pser_other))

    def test_rmod(self):
        pser = pd.Series([100, None, -300, None, 500, -700])
        pser_other = pd.Series([-150] * 6)
        psser = ps.from_pandas(pser)
        psser_other = ps.from_pandas(pser_other)

        self.assert_eq(psser.rmod(psser_other).sort_index(), pser.rmod(pser_other))
        self.assert_eq(psser.rmod(psser_other).sort_index(), pser.rmod(pser_other))
        self.assert_eq(psser.rmod(psser_other).sort_index(), pser.rmod(pser_other))

    def test_getitem_boolean_series(self):
        pdf1 = pd.DataFrame(
            {"A": [0, 1, 2, 3, 4], "B": [100, 200, 300, 400, 500]}, index=[20, 10, 30, 0, 50]
        )
        pdf2 = pd.DataFrame(
            {"A": [0, -1, -2, -3, -4], "B": [-100, -200, -300, -400, -500]},
            index=[0, 30, 10, 20, 50],
        )
        psdf1 = ps.from_pandas(pdf1)
        psdf2 = ps.from_pandas(pdf2)

        self.assert_eq(pdf1[pdf2.A > -3].sort_index(), psdf1[psdf2.A > -3].sort_index())

        self.assert_eq(pdf1.A[pdf2.A > -3].sort_index(), psdf1.A[psdf2.A > -3].sort_index())

        self.assert_eq(
            (pdf1.A + 1)[pdf2.A > -3].sort_index(), (psdf1.A + 1)[psdf2.A > -3].sort_index()
        )

    def test_loc_getitem_boolean_series(self):
        pdf1 = pd.DataFrame(
            {"A": [0, 1, 2, 3, 4], "B": [100, 200, 300, 400, 500]}, index=[20, 10, 30, 0, 50]
        )
        pdf2 = pd.DataFrame(
            {"A": [0, -1, -2, -3, -4], "B": [-100, -200, -300, -400, -500]},
            index=[20, 10, 30, 0, 50],
        )
        psdf1 = ps.from_pandas(pdf1)
        psdf2 = ps.from_pandas(pdf2)

        self.assert_eq(pdf1.loc[pdf2.A > -3].sort_index(), psdf1.loc[psdf2.A > -3].sort_index())

        self.assert_eq(pdf1.A.loc[pdf2.A > -3].sort_index(), psdf1.A.loc[psdf2.A > -3].sort_index())

        self.assert_eq(
            (pdf1.A + 1).loc[pdf2.A > -3].sort_index(), (psdf1.A + 1).loc[psdf2.A > -3].sort_index()
        )

        pser = pd.Series([0, 1, 2, 3, 4], index=[20, 10, 30, 0, 50])
        psser = ps.from_pandas(pser)
        self.assert_eq(pser.loc[pdf2.A > -3].sort_index(), psser.loc[psdf2.A > -3].sort_index())
        pser.name = psser.name = "B"
        self.assert_eq(pser.loc[pdf2.A > -3].sort_index(), psser.loc[psdf2.A > -3].sort_index())

    def test_bitwise(self):
        pser1 = pd.Series([True, False, True, False, np.nan, np.nan, True, False, np.nan])
        pser2 = pd.Series([True, False, False, True, True, False, np.nan, np.nan, np.nan])
        psser1 = ps.from_pandas(pser1)
        psser2 = ps.from_pandas(pser2)

        self.assert_eq(pser1 | pser2, (psser1 | psser2).sort_index())
        self.assert_eq(pser1 & pser2, (psser1 & psser2).sort_index())

        pser1 = pd.Series([True, False, np.nan], index=list("ABC"))
        pser2 = pd.Series([False, True, np.nan], index=list("DEF"))
        psser1 = ps.from_pandas(pser1)
        psser2 = ps.from_pandas(pser2)

        self.assert_eq(pser1 | pser2, (psser1 | psser2).sort_index())
        self.assert_eq(pser1 & pser2, (psser1 & psser2).sort_index())

    @unittest.skipIf(
        not extension_object_dtypes_available, "pandas extension object dtypes are not available"
    )
    def test_bitwise_extension_dtype(self):
        def assert_eq(actual, expected):
            if LooseVersion("1.1") <= LooseVersion(pd.__version__) < LooseVersion("1.2.2"):
                self.assert_eq(actual, expected, check_exact=False)
                self.assertTrue(isinstance(actual.dtype, extension_dtypes))
            else:
                self.assert_eq(actual, expected)

        pser1 = pd.Series(
            [True, False, True, False, np.nan, np.nan, True, False, np.nan], dtype="boolean"
        )
        pser2 = pd.Series(
            [True, False, False, True, True, False, np.nan, np.nan, np.nan], dtype="boolean"
        )
        psser1 = ps.from_pandas(pser1)
        psser2 = ps.from_pandas(pser2)

        assert_eq((psser1 | psser2).sort_index(), pser1 | pser2)
        assert_eq((psser1 & psser2).sort_index(), pser1 & pser2)

        pser1 = pd.Series([True, False, np.nan], index=list("ABC"), dtype="boolean")
        pser2 = pd.Series([False, True, np.nan], index=list("DEF"), dtype="boolean")
        psser1 = ps.from_pandas(pser1)
        psser2 = ps.from_pandas(pser2)

        # a pandas bug?
        # assert_eq((psser1 | psser2).sort_index(), pser1 | pser2)
        # assert_eq((psser1 & psser2).sort_index(), pser1 & pser2)
        assert_eq(
            (psser1 | psser2).sort_index(),
            pd.Series([True, None, None, None, True, None], index=list("ABCDEF"), dtype="boolean"),
        )
        assert_eq(
            (psser1 & psser2).sort_index(),
            pd.Series(
                [None, False, None, False, None, None], index=list("ABCDEF"), dtype="boolean"
            ),
        )

    @unittest.skipIf(
        LooseVersion(pd.__version__) >= LooseVersion("2.0.0"),
        "TODO(SPARK-43453): Enable OpsOnDiffFramesEnabledTests.test_concat_column_axis "
        "for pandas 2.0.0.",
    )
    def test_concat_column_axis(self):
        pdf1 = pd.DataFrame({"A": [0, 2, 4], "B": [1, 3, 5]}, index=[1, 2, 3])
        pdf1.columns.names = ["AB"]
        pdf2 = pd.DataFrame({"C": [1, 2, 3], "D": [4, 5, 6]}, index=[1, 3, 5])
        pdf2.columns.names = ["CD"]
        psdf1 = ps.from_pandas(pdf1)
        psdf2 = ps.from_pandas(pdf2)

        psdf3 = psdf1.copy()
        psdf4 = psdf2.copy()
        pdf3 = pdf1.copy()
        pdf4 = pdf2.copy()

        columns = pd.MultiIndex.from_tuples([("X", "A"), ("X", "B")], names=["X", "AB"])
        pdf3.columns = columns
        psdf3.columns = columns

        columns = pd.MultiIndex.from_tuples([("X", "C"), ("X", "D")], names=["Y", "CD"])
        pdf4.columns = columns
        psdf4.columns = columns

        pdf5 = pd.DataFrame({"A": [0, 2, 4], "B": [1, 3, 5]}, index=[1, 2, 3])
        pdf6 = pd.DataFrame({"C": [1, 2, 3]}, index=[1, 3, 5])
        psdf5 = ps.from_pandas(pdf5)
        psdf6 = ps.from_pandas(pdf6)

        ignore_indexes = [True, False]
        joins = ["inner", "outer"]

        objs = [
            ([psdf1.A, psdf2.C], [pdf1.A, pdf2.C]),
            # TODO: ([psdf1, psdf2.C], [pdf1, pdf2.C]),
            ([psdf1.A, psdf2], [pdf1.A, pdf2]),
            ([psdf1.A, psdf2.C], [pdf1.A, pdf2.C]),
            ([psdf3[("X", "A")], psdf4[("X", "C")]], [pdf3[("X", "A")], pdf4[("X", "C")]]),
            ([psdf3, psdf4[("X", "C")]], [pdf3, pdf4[("X", "C")]]),
            ([psdf3[("X", "A")], psdf4], [pdf3[("X", "A")], pdf4]),
            ([psdf3, psdf4], [pdf3, pdf4]),
            ([psdf5, psdf6], [pdf5, pdf6]),
            ([psdf6, psdf5], [pdf6, pdf5]),
        ]

        for ignore_index, join in product(ignore_indexes, joins):
            for i, (psdfs, pdfs) in enumerate(objs):
                with self.subTest(ignore_index=ignore_index, join=join, pdfs=pdfs, pair=i):
                    actual = ps.concat(psdfs, axis=1, ignore_index=ignore_index, join=join)
                    expected = pd.concat(pdfs, axis=1, ignore_index=ignore_index, join=join)
                    self.assert_eq(
                        repr(actual.sort_values(list(actual.columns)).reset_index(drop=True)),
                        repr(expected.sort_values(list(expected.columns)).reset_index(drop=True)),
                    )
                    actual = ps.concat(
                        psdfs, axis=1, ignore_index=ignore_index, join=join, sort=True
                    )
                    expected = pd.concat(
                        pdfs, axis=1, ignore_index=ignore_index, join=join, sort=True
                    )
                    self.assert_eq(
                        repr(actual.reset_index(drop=True)),
                        repr(expected.reset_index(drop=True)),
                    )

    def test_combine_first(self):
        pser1 = pd.Series({"falcon": 330.0, "eagle": 160.0})
        pser2 = pd.Series({"falcon": 345.0, "eagle": 200.0, "duck": 30.0})
        psser1 = ps.from_pandas(pser1)
        psser2 = ps.from_pandas(pser2)

        self.assert_eq(
            psser1.combine_first(psser2).sort_index(), pser1.combine_first(pser2).sort_index()
        )
        with self.assertRaisesRegex(
            TypeError, "`combine_first` only allows `Series` for parameter `other`"
        ):
            psser1.combine_first(50)

        psser1.name = ("X", "A")
        psser2.name = ("Y", "B")
        pser1.name = ("X", "A")
        pser2.name = ("Y", "B")
        self.assert_eq(
            psser1.combine_first(psser2).sort_index(), pser1.combine_first(pser2).sort_index()
        )

        # MultiIndex
        midx1 = pd.MultiIndex(
            [["lama", "cow", "falcon", "koala"], ["speed", "weight", "length", "power"]],
            [[0, 3, 1, 1, 1, 2, 2, 2], [0, 2, 0, 3, 2, 0, 1, 3]],
        )
        midx2 = pd.MultiIndex(
            [["lama", "cow", "falcon"], ["speed", "weight", "length"]],
            [[0, 0, 0, 1, 1, 1, 2, 2, 2], [0, 1, 2, 0, 1, 2, 0, 1, 2]],
        )
        pser1 = pd.Series([45, 200, 1.2, 30, 250, 1.5, 320, 1], index=midx1)
        pser2 = pd.Series([-45, 200, -1.2, 30, -250, 1.5, 320, 1, -0.3], index=midx2)
        psser1 = ps.from_pandas(pser1)
        psser2 = ps.from_pandas(pser2)

        self.assert_eq(
            psser1.combine_first(psser2).sort_index(), pser1.combine_first(pser2).sort_index()
        )

        # DataFrame
        pdf1 = pd.DataFrame({"A": [None, 0], "B": [4, None]})
        psdf1 = ps.from_pandas(pdf1)
        pdf2 = pd.DataFrame({"C": [3, 3], "B": [1, 1]})
        psdf2 = ps.from_pandas(pdf2)

        if LooseVersion(pd.__version__) >= LooseVersion("1.2.0"):
            self.assert_eq(pdf1.combine_first(pdf2), psdf1.combine_first(psdf2).sort_index())
        else:
            # pandas < 1.2.0 returns unexpected dtypes,
            # please refer to https://github.com/pandas-dev/pandas/issues/28481 for details
            expected_pdf = pd.DataFrame({"A": [None, 0], "B": [4.0, 1.0], "C": [3, 3]})
            self.assert_eq(expected_pdf, psdf1.combine_first(psdf2).sort_index())

        pdf1.columns = pd.MultiIndex.from_tuples([("A", "willow"), ("B", "pine")])
        psdf1 = ps.from_pandas(pdf1)
        pdf2.columns = pd.MultiIndex.from_tuples([("C", "oak"), ("B", "pine")])
        psdf2 = ps.from_pandas(pdf2)

        if LooseVersion(pd.__version__) >= LooseVersion("1.2.0"):
            self.assert_eq(pdf1.combine_first(pdf2), psdf1.combine_first(psdf2).sort_index())
        else:
            # pandas < 1.2.0 returns unexpected dtypes,
            # please refer to https://github.com/pandas-dev/pandas/issues/28481 for details
            expected_pdf = pd.DataFrame({"A": [None, 0], "B": [4.0, 1.0], "C": [3, 3]})
            expected_pdf.columns = pd.MultiIndex.from_tuples(
                [("A", "willow"), ("B", "pine"), ("C", "oak")]
            )
            self.assert_eq(expected_pdf, psdf1.combine_first(psdf2).sort_index())

    def test_insert(self):
        #
        # Basic DataFrame
        #
        pdf = pd.DataFrame([1, 2, 3])
        psdf = ps.from_pandas(pdf)

        pser = pd.Series([4, 5, 6])
        psser = ps.from_pandas(pser)
        psdf.insert(1, "y", psser)
        pdf.insert(1, "y", pser)
        self.assert_eq(psdf.sort_index(), pdf.sort_index())

        #
        # DataFrame with Index different from inserting Series'
        #
        pdf = pd.DataFrame([1, 2, 3], index=[10, 20, 30])
        psdf = ps.from_pandas(pdf)

        pser = pd.Series([4, 5, 6])
        psser = ps.from_pandas(pser)
        psdf.insert(1, "y", psser)
        pdf.insert(1, "y", pser)
        self.assert_eq(psdf.sort_index(), pdf.sort_index())

        #
        # DataFrame with Multi-index columns
        #
        pdf = pd.DataFrame({("x", "a"): [1, 2, 3]})
        psdf = ps.from_pandas(pdf)

        pser = pd.Series([4, 5, 6])
        psser = ps.from_pandas(pser)
        pdf = pd.DataFrame({("x", "a", "b"): [1, 2, 3]})
        psdf = ps.from_pandas(pdf)
        psdf.insert(0, "a", psser)
        pdf.insert(0, "a", pser)
        self.assert_eq(psdf.sort_index(), pdf.sort_index())
        psdf.insert(0, ("b", "c", ""), psser)
        pdf.insert(0, ("b", "c", ""), pser)
        self.assert_eq(psdf.sort_index(), pdf.sort_index())

    def test_compare(self):
        if LooseVersion(pd.__version__) >= LooseVersion("1.1"):
            pser1 = pd.Series(["b", "c", np.nan, "g", np.nan])
            pser2 = pd.Series(["a", "c", np.nan, np.nan, "h"])
            psser1 = ps.from_pandas(pser1)
            psser2 = ps.from_pandas(pser2)
            self.assert_eq(
                pser1.compare(pser2).sort_index(),
                psser1.compare(psser2).sort_index(),
            )

            # `keep_shape=True`
            self.assert_eq(
                pser1.compare(pser2, keep_shape=True).sort_index(),
                psser1.compare(psser2, keep_shape=True).sort_index(),
            )
            # `keep_equal=True`
            self.assert_eq(
                pser1.compare(pser2, keep_equal=True).sort_index(),
                psser1.compare(psser2, keep_equal=True).sort_index(),
            )
            # `keep_shape=True` and `keep_equal=True`
            self.assert_eq(
                pser1.compare(pser2, keep_shape=True, keep_equal=True).sort_index(),
                psser1.compare(psser2, keep_shape=True, keep_equal=True).sort_index(),
            )

            # MultiIndex
            pser1.index = pd.MultiIndex.from_tuples(
                [("a", "x"), ("b", "y"), ("c", "z"), ("x", "k"), ("q", "l")]
            )
            pser2.index = pd.MultiIndex.from_tuples(
                [("a", "x"), ("b", "y"), ("c", "z"), ("x", "k"), ("q", "l")]
            )
            psser1 = ps.from_pandas(pser1)
            psser2 = ps.from_pandas(pser2)
            self.assert_eq(
                pser1.compare(pser2).sort_index(),
                psser1.compare(psser2).sort_index(),
            )

            # `keep_shape=True` with MultiIndex
            self.assert_eq(
                pser1.compare(pser2, keep_shape=True).sort_index(),
                psser1.compare(psser2, keep_shape=True).sort_index(),
            )
            # `keep_equal=True` with MultiIndex
            self.assert_eq(
                pser1.compare(pser2, keep_equal=True).sort_index(),
                psser1.compare(psser2, keep_equal=True).sort_index(),
            )
            # `keep_shape=True` and `keep_equal=True` with MultiIndex
            self.assert_eq(
                pser1.compare(pser2, keep_shape=True, keep_equal=True).sort_index(),
                psser1.compare(psser2, keep_shape=True, keep_equal=True).sort_index(),
            )
        else:
            psser1 = ps.Series(["b", "c", np.nan, "g", np.nan])
            psser2 = ps.Series(["a", "c", np.nan, np.nan, "h"])
            expected = ps.DataFrame(
                [["b", "a"], ["g", None], [None, "h"]], index=[0, 3, 4], columns=["self", "other"]
            )
            self.assert_eq(expected, psser1.compare(psser2).sort_index())

            # `keep_shape=True`
            expected = ps.DataFrame(
                [["b", "a"], [None, None], [None, None], ["g", None], [None, "h"]],
                index=[0, 1, 2, 3, 4],
                columns=["self", "other"],
            )
            self.assert_eq(
                expected,
                psser1.compare(psser2, keep_shape=True).sort_index(),
            )
            # `keep_equal=True`
            expected = ps.DataFrame(
                [["b", "a"], ["g", None], [None, "h"]], index=[0, 3, 4], columns=["self", "other"]
            )
            self.assert_eq(
                expected,
                psser1.compare(psser2, keep_equal=True).sort_index(),
            )
            # `keep_shape=True` and `keep_equal=True`
            expected = ps.DataFrame(
                [["b", "a"], ["c", "c"], [None, None], ["g", None], [None, "h"]],
                index=[0, 1, 2, 3, 4],
                columns=["self", "other"],
            )
            self.assert_eq(
                expected,
                psser1.compare(psser2, keep_shape=True, keep_equal=True).sort_index(),
            )

            # MultiIndex
            psser1 = ps.Series(
                ["b", "c", np.nan, "g", np.nan],
                index=pd.MultiIndex.from_tuples(
                    [("a", "x"), ("b", "y"), ("c", "z"), ("x", "k"), ("q", "l")]
                ),
            )
            psser2 = ps.Series(
                ["a", "c", np.nan, np.nan, "h"],
                index=pd.MultiIndex.from_tuples(
                    [("a", "x"), ("b", "y"), ("c", "z"), ("x", "k"), ("q", "l")]
                ),
            )
            expected = ps.DataFrame(
                [["b", "a"], [None, "h"], ["g", None]],
                index=pd.MultiIndex.from_tuples([("a", "x"), ("q", "l"), ("x", "k")]),
                columns=["self", "other"],
            )
            self.assert_eq(expected, psser1.compare(psser2).sort_index())

            # `keep_shape=True`
            expected = ps.DataFrame(
                [["b", "a"], [None, None], [None, None], [None, "h"], ["g", None]],
                index=pd.MultiIndex.from_tuples(
                    [("a", "x"), ("b", "y"), ("c", "z"), ("q", "l"), ("x", "k")]
                ),
                columns=["self", "other"],
            )
            self.assert_eq(
                expected,
                psser1.compare(psser2, keep_shape=True).sort_index(),
            )
            # `keep_equal=True`
            expected = ps.DataFrame(
                [["b", "a"], [None, "h"], ["g", None]],
                index=pd.MultiIndex.from_tuples([("a", "x"), ("q", "l"), ("x", "k")]),
                columns=["self", "other"],
            )
            self.assert_eq(
                expected,
                psser1.compare(psser2, keep_equal=True).sort_index(),
            )
            # `keep_shape=True` and `keep_equal=True`
            expected = ps.DataFrame(
                [["b", "a"], ["c", "c"], [None, None], [None, "h"], ["g", None]],
                index=pd.MultiIndex.from_tuples(
                    [("a", "x"), ("b", "y"), ("c", "z"), ("q", "l"), ("x", "k")]
                ),
                columns=["self", "other"],
            )
            self.assert_eq(
                expected,
                psser1.compare(psser2, keep_shape=True, keep_equal=True).sort_index(),
            )

        # Different Index
        with self.assertRaisesRegex(
            ValueError, "Can only compare identically-labeled Series objects"
        ):
            psser1 = ps.Series(
                [1, 2, 3, 4, 5],
                index=pd.Index([1, 2, 3, 4, 5]),
            )
            psser2 = ps.Series(
                [2, 2, 3, 4, 1],
                index=pd.Index([5, 4, 3, 2, 1]),
            )
            psser1.compare(psser2)
        # Different MultiIndex
        with self.assertRaisesRegex(
            ValueError, "Can only compare identically-labeled Series objects"
        ):
            psser1 = ps.Series(
                [1, 2, 3, 4, 5],
                index=pd.MultiIndex.from_tuples(
                    [("a", "x"), ("b", "y"), ("c", "z"), ("x", "k"), ("q", "l")]
                ),
            )
            psser2 = ps.Series(
                [2, 2, 3, 4, 1],
                index=pd.MultiIndex.from_tuples(
                    [("a", "x"), ("b", "y"), ("c", "a"), ("x", "k"), ("q", "l")]
                ),
            )
            psser1.compare(psser2)
        # SPARK-37495: Skip identical index checking of Series.compare when config
        # 'compute.eager_check' is disabled
        psser1 = ps.Series([1, 2, 3, 4, 5], index=pd.Index([1, 2, 3, 4, 5]))
        psser2 = ps.Series([1, 2, 3, 4, 5, 6], index=pd.Index([1, 2, 4, 3, 6, 7]))
        expected = ps.DataFrame(
            {"self": [3, 4, 5, np.nan, np.nan], "other": [4, 3, np.nan, 5.0, 6.0]},
            index=[3, 4, 5, 6, 7],
        )

        with ps.option_context("compute.eager_check", False):
            self.assert_eq(expected, psser1.compare(psser2))

    def test_different_columns(self):
        psdf1 = self.psdf1
        psdf4 = self.psdf4
        pdf1 = self.pdf1
        pdf4 = self.pdf4

        self.assert_eq((psdf1 + psdf4).sort_index(), (pdf1 + pdf4).sort_index(), almost=True)

        # Multi-index columns
        columns = pd.MultiIndex.from_tuples([("x", "a"), ("x", "b")])
        psdf1.columns = columns
        pdf1.columns = columns
        columns = pd.MultiIndex.from_tuples([("z", "e"), ("z", "f")])
        psdf4.columns = columns
        pdf4.columns = columns

        self.assert_eq((psdf1 + psdf4).sort_index(), (pdf1 + pdf4).sort_index(), almost=True)

    def test_assignment_series(self):
        psdf = ps.from_pandas(self.pdf1)
        pdf = self.pdf1
        psser = psdf.a
        pser = pdf.a
        psdf["a"] = self.psdf2.a
        pdf["a"] = self.pdf2.a

        self.assert_eq(psdf.sort_index(), pdf.sort_index())
        self.assert_eq(psser, pser)

        psdf = ps.from_pandas(self.pdf1)
        pdf = self.pdf1
        psser = psdf.a
        pser = pdf.a
        psdf["a"] = self.psdf2.b
        pdf["a"] = self.pdf2.b

        self.assert_eq(psdf.sort_index(), pdf.sort_index())
        self.assert_eq(psser, pser)

        psdf = ps.from_pandas(self.pdf1)
        pdf = self.pdf1
        psdf["c"] = self.psdf2.a
        pdf["c"] = self.pdf2.a

        self.assert_eq(psdf.sort_index(), pdf.sort_index())

        # Multi-index columns
        psdf = ps.from_pandas(self.pdf1)
        pdf = self.pdf1
        columns = pd.MultiIndex.from_tuples([("x", "a"), ("x", "b")])
        psdf.columns = columns
        pdf.columns = columns
        psdf[("y", "c")] = self.psdf2.a
        pdf[("y", "c")] = self.pdf2.a

        self.assert_eq(psdf.sort_index(), pdf.sort_index())

        pdf = pd.DataFrame({"a": [1, 2, 3], "Koalas": [0, 1, 2]}).set_index("Koalas", drop=False)
        psdf = ps.from_pandas(pdf)

        psdf.index.name = None
        psdf["NEW"] = ps.Series([100, 200, 300])

        pdf.index.name = None
        pdf["NEW"] = pd.Series([100, 200, 300])

        self.assert_eq(psdf.sort_index(), pdf.sort_index())

    def test_assignment_frame(self):
        psdf = ps.from_pandas(self.pdf1)
        pdf = self.pdf1
        psser = psdf.a
        pser = pdf.a
        psdf[["a", "b"]] = self.psdf1
        pdf[["a", "b"]] = self.pdf1

        self.assert_eq(psdf.sort_index(), pdf.sort_index())
        self.assert_eq(psser, pser)

        # 'c' does not exist in `psdf`.
        psdf = ps.from_pandas(self.pdf1)
        pdf = self.pdf1
        psser = psdf.a
        pser = pdf.a
        psdf[["b", "c"]] = self.psdf1
        pdf[["b", "c"]] = self.pdf1

        self.assert_eq(psdf.sort_index(), pdf.sort_index())
        self.assert_eq(psser, pser)

        # 'c' and 'd' do not exist in `psdf`.
        psdf = ps.from_pandas(self.pdf1)
        pdf = self.pdf1
        psdf[["c", "d"]] = self.psdf1
        pdf[["c", "d"]] = self.pdf1

        self.assert_eq(psdf.sort_index(), pdf.sort_index())

        # Multi-index columns
        columns = pd.MultiIndex.from_tuples([("x", "a"), ("x", "b")])
        psdf = ps.from_pandas(self.pdf1)
        pdf = self.pdf1
        psdf.columns = columns
        pdf.columns = columns
        psdf[[("y", "c"), ("z", "d")]] = self.psdf1
        pdf[[("y", "c"), ("z", "d")]] = self.pdf1

        self.assert_eq(psdf.sort_index(), pdf.sort_index())

        psdf = ps.from_pandas(self.pdf1)
        pdf = self.pdf1
        psdf1 = ps.from_pandas(self.pdf1)
        pdf1 = self.pdf1
        psdf1.columns = columns
        pdf1.columns = columns
        psdf[["c", "d"]] = psdf1
        pdf[["c", "d"]] = pdf1

        self.assert_eq(psdf.sort_index(), pdf.sort_index())

    def test_assignment_series_chain(self):
        psdf = ps.from_pandas(self.pdf1)
        pdf = self.pdf1
        psdf["a"] = self.psdf1.a
        pdf["a"] = self.pdf1.a

        psdf["a"] = self.psdf2.b
        pdf["a"] = self.pdf2.b

        psdf["d"] = self.psdf3.c
        pdf["d"] = self.pdf3.c

        self.assert_eq(psdf.sort_index(), pdf.sort_index())

    def test_assignment_frame_chain(self):
        psdf = ps.from_pandas(self.pdf1)
        pdf = self.pdf1
        psdf[["a", "b"]] = self.psdf1
        pdf[["a", "b"]] = self.pdf1

        psdf[["e", "f"]] = self.psdf3
        pdf[["e", "f"]] = self.pdf3

        psdf[["b", "c"]] = self.psdf2
        pdf[["b", "c"]] = self.pdf2

        self.assert_eq(psdf.sort_index(), pdf.sort_index())

    def test_multi_index_arithmetic(self):
        psdf5 = self.psdf5
        psdf6 = self.psdf6
        pdf5 = self.pdf5
        pdf6 = self.pdf6

        # Series
        self.assert_eq((psdf5.c - psdf6.e).sort_index(), (pdf5.c - pdf6.e).sort_index())

        self.assert_eq((psdf5["c"] / psdf6["e"]).sort_index(), (pdf5["c"] / pdf6["e"]).sort_index())

        # DataFrame
        self.assert_eq((psdf5 + psdf6).sort_index(), (pdf5 + pdf6).sort_index(), almost=True)

    def test_multi_index_assignment_series(self):
        psdf = ps.from_pandas(self.pdf5)
        pdf = self.pdf5
        psdf["x"] = self.psdf6.e
        pdf["x"] = self.pdf6.e

        self.assert_eq(psdf.sort_index(), pdf.sort_index())

        psdf = ps.from_pandas(self.pdf5)
        pdf = self.pdf5
        psdf["e"] = self.psdf6.e
        pdf["e"] = self.pdf6.e

        self.assert_eq(psdf.sort_index(), pdf.sort_index())

        psdf = ps.from_pandas(self.pdf5)
        pdf = self.pdf5
        psdf["c"] = self.psdf6.e
        pdf["c"] = self.pdf6.e

        self.assert_eq(psdf.sort_index(), pdf.sort_index())

    def test_multi_index_assignment_frame(self):
        psdf = ps.from_pandas(self.pdf5)
        pdf = self.pdf5
        psdf[["c"]] = self.psdf5
        pdf[["c"]] = self.pdf5

        self.assert_eq(psdf.sort_index(), pdf.sort_index())

        psdf = ps.from_pandas(self.pdf5)
        pdf = self.pdf5
        psdf[["x"]] = self.psdf5
        pdf[["x"]] = self.pdf5

        self.assert_eq(psdf.sort_index(), pdf.sort_index())

        psdf = ps.from_pandas(self.pdf6)
        pdf = self.pdf6
        psdf[["x", "y"]] = self.psdf6
        pdf[["x", "y"]] = self.pdf6

        self.assert_eq(psdf.sort_index(), pdf.sort_index())


class OpsOnDiffFramesDisabledTestsMixin:
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        set_option("compute.ops_on_diff_frames", False)

    @classmethod
    def tearDownClass(cls):
        reset_option("compute.ops_on_diff_frames")
        super().tearDownClass()

    @property
    def pdf1(self):
        return pd.DataFrame(
            {"a": [1, 2, 3, 4, 5, 6, 7, 8, 9], "b": [4, 5, 6, 3, 2, 1, 0, 0, 0]},
            index=[0, 1, 3, 5, 6, 8, 9, 9, 9],
        )

    @property
    def pdf2(self):
        return pd.DataFrame(
            {"a": [9, 8, 7, 6, 5, 4, 3, 2, 1], "b": [0, 0, 0, 4, 5, 6, 1, 2, 3]},
            index=list(range(9)),
        )

    @property
    def psdf1(self):
        return ps.from_pandas(self.pdf1)

    @property
    def psdf2(self):
        return ps.from_pandas(self.pdf2)

    def test_arithmetic(self):
        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            self.psdf1.a - self.psdf2.b

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            self.psdf1.a - self.psdf2.a

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            self.psdf1["a"] - self.psdf2["a"]

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            self.psdf1 - self.psdf2

    def test_assignment(self):
        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psdf = ps.from_pandas(self.pdf1)
            psdf["c"] = self.psdf1.a

    def test_frame_loc_setitem(self):
        pdf = pd.DataFrame(
            [[1, 2], [4, 5], [7, 8]],
            index=["cobra", "viper", "sidewinder"],
            columns=["max_speed", "shield"],
        )
        psdf = ps.DataFrame(pdf)
        another_psdf = ps.DataFrame(pdf)

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psdf.loc[["viper", "sidewinder"], ["shield"]] = another_psdf.max_speed

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psdf.loc[another_psdf.max_speed < 5, ["shield"]] = -psdf.max_speed

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psdf.loc[another_psdf.max_speed < 5, ["shield"]] = -another_psdf.max_speed

    def test_frame_iloc_setitem(self):
        pdf = pd.DataFrame(
            [[1, 2], [4, 5], [7, 8]],
            index=["cobra", "viper", "sidewinder"],
            columns=["max_speed", "shield"],
        )
        psdf = ps.DataFrame(pdf)
        another_psdf = ps.DataFrame(pdf)

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psdf.iloc[[1, 2], [1]] = another_psdf.max_speed.iloc[[1, 2]]

    def test_series_loc_setitem(self):
        pser = pd.Series([1, 2, 3], index=["cobra", "viper", "sidewinder"])
        psser = ps.from_pandas(pser)

        pser_another = pd.Series([1, 2, 3], index=["cobra", "viper", "sidewinder"])
        psser_another = ps.from_pandas(pser_another)

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psser.loc[psser % 2 == 1] = -psser_another

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psser.loc[psser_another % 2 == 1] = -psser

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psser.loc[psser_another % 2 == 1] = -psser_another

    def test_series_iloc_setitem(self):
        pser = pd.Series([1, 2, 3], index=["cobra", "viper", "sidewinder"])
        psser = ps.from_pandas(pser)

        pser_another = pd.Series([1, 2, 3], index=["cobra", "viper", "sidewinder"])
        psser_another = ps.from_pandas(pser_another)

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psser.iloc[[1]] = -psser_another.iloc[[1]]

    def test_where(self):
        pdf1 = pd.DataFrame({"A": [0, 1, 2, 3, 4], "B": [100, 200, 300, 400, 500]})
        pdf2 = pd.DataFrame({"A": [0, -1, -2, -3, -4], "B": [-100, -200, -300, -400, -500]})
        psdf1 = ps.from_pandas(pdf1)
        psdf2 = ps.from_pandas(pdf2)

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psdf1.where(psdf2 > 100)

        pdf1 = pd.DataFrame({"A": [-1, -2, -3, -4, -5], "B": [-100, -200, -300, -400, -500]})
        pdf2 = pd.DataFrame({"A": [-10, -20, -30, -40, -50], "B": [-5, -4, -3, -2, -1]})
        psdf1 = ps.from_pandas(pdf1)
        psdf2 = ps.from_pandas(pdf2)

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psdf1.where(psdf2 < -250)

    def test_mask(self):
        pdf1 = pd.DataFrame({"A": [0, 1, 2, 3, 4], "B": [100, 200, 300, 400, 500]})
        pdf2 = pd.DataFrame({"A": [0, -1, -2, -3, -4], "B": [-100, -200, -300, -400, -500]})
        psdf1 = ps.from_pandas(pdf1)
        psdf2 = ps.from_pandas(pdf2)

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psdf1.mask(psdf2 < 100)

        pdf1 = pd.DataFrame({"A": [-1, -2, -3, -4, -5], "B": [-100, -200, -300, -400, -500]})
        pdf2 = pd.DataFrame({"A": [-10, -20, -30, -40, -50], "B": [-5, -4, -3, -2, -1]})
        psdf1 = ps.from_pandas(pdf1)
        psdf2 = ps.from_pandas(pdf2)

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psdf1.mask(psdf2 > -250)

    def test_align(self):
        pdf1 = pd.DataFrame({"a": [1, 2, 3], "b": ["a", "b", "c"]}, index=[10, 20, 30])
        pdf2 = pd.DataFrame({"a": [4, 5, 6], "c": ["d", "e", "f"]}, index=[10, 11, 12])
        psdf1 = ps.from_pandas(pdf1)
        psdf2 = ps.from_pandas(pdf2)

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psdf1.align(psdf2)

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psdf1.align(psdf2, axis=0)

    def test_pow_and_rpow(self):
        pser = pd.Series([1, 2, np.nan])
        psser = ps.from_pandas(pser)
        pser_other = pd.Series([np.nan, 2, 3])
        psser_other = ps.from_pandas(pser_other)

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psser.pow(psser_other)
        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psser**psser_other
        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psser.rpow(psser_other)

    def test_equals(self):
        psidx1 = ps.Index([1, 2, 3, 4])
        psidx2 = ps.Index([1, 2, 3, 4])

        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psidx1.equals(psidx2)

    def test_combine_first(self):
        pdf1 = pd.DataFrame({"A": [None, 0], "B": [4, None]})
        psdf1 = ps.from_pandas(pdf1)

        self.assertRaises(TypeError, lambda: psdf1.combine_first(ps.Series([1, 2])))

        pser1 = pd.Series({"falcon": 330.0, "eagle": 160.0})
        pser2 = pd.Series({"falcon": 345.0, "eagle": 200.0, "duck": 30.0})
        psser1 = ps.from_pandas(pser1)
        psser2 = ps.from_pandas(pser2)
        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psser1.combine_first(psser2)

        pdf1 = pd.DataFrame({"A": [None, 0], "B": [4, None]})
        psdf1 = ps.from_pandas(pdf1)
        pdf2 = pd.DataFrame({"C": [3, 3], "B": [1, 1]})
        psdf2 = ps.from_pandas(pdf2)
        with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
            psdf1.combine_first(psdf2)

    def test_series_eq(self):
        pser = pd.Series([1, 2, 3, 4, 5, 6], name="x")
        psser = ps.from_pandas(pser)

        others = (
            ps.Series([np.nan, 1, 3, 4, np.nan, 6], name="x"),
            ps.Index([np.nan, 1, 3, 4, np.nan, 6], name="x"),
        )
        for other in others:
            with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
                psser.eq(other)
            with self.assertRaisesRegex(ValueError, "Cannot combine the series or dataframe"):
                psser == other


class OpsOnDiffFramesEnabledTests(
    OpsOnDiffFramesEnabledTestsMixin, PandasOnSparkTestCase, SQLTestUtils
):
    pass


class OpsOnDiffFramesDisabledTests(
    OpsOnDiffFramesDisabledTestsMixin, PandasOnSparkTestCase, SQLTestUtils
):
    pass


if __name__ == "__main__":
    from pyspark.pandas.tests.test_ops_on_diff_frames import *  # noqa: F401

    try:
        import xmlrunner

        testRunner = xmlrunner.XMLTestRunner(output="target/test-reports", verbosity=2)
    except ImportError:
        testRunner = None
    unittest.main(testRunner=testRunner, verbosity=2)
